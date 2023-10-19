import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BirdInterface, PipeInterface, StateGame } from '../../types/game.interface';
import { Observable, Subscription, fromEvent, interval } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-flabird',
  templateUrl: './flabird.component.html',
  styleUrls: ['./flabird.component.css']
})
export class FlabirdComponent implements OnInit, OnDestroy {

  private currentState: number = 0;
  private board!: HTMLCanvasElement;
  
  private boardWidth: number = 360;
  private boardHeight: number = 640;

  //splash
  private splashImg!: HTMLImageElement;
  private splashWidth: number = 188;
  private splashHeight: number = 170;
  private splashX: number = this.boardWidth/5;
  private splashY: number = this.boardHeight/3;

  //bird
  private birdWidth: number = 34; //width/height ratio = 408/228 = 17/12
  private birdHeight: number = 24;
  private birdX: number = this.boardWidth/8;
  private birdY: number = this.boardHeight/2;
  private birdImg!: HTMLImageElement;
  
   
  //pipes
  private pipeArray: PipeInterface[] = [];
  private pipeWidth: number = 64; //width/height ratio = 384/3072 = 1/8
  private pipeHeight: number = 512;
  private pipeX: number = this.boardWidth;
  private pipeY: number = 0;

  private topPipeImg!: HTMLImageElement;
  private bottomPipeImg!: HTMLImageElement;

  private randomPipeY!: number;
  private openingSpace!: number;

  //physics
  private velocityX: number= -2; //pipes moving left speed
  private velocityY: number = 0; //bird jump speed
  private gravity: number = 0.25;
  private landY!: number;

  private gameOver: boolean = false;
  private score: number = 0;
  private hightScore: number = 0;
  private cookieHightscore!: string;

  private idPipes!: Subscription;
  private idClick!: Subscription;
  
  private loopPipes!: Observable<number>;

  private bird: BirdInterface = {
    x: this.birdX,
    y: this.birdY,
    width: this.birdWidth,
    height: this.birdHeight
  }

  private bottomPipe!: PipeInterface;
  private topPipe!: PipeInterface;


  @ViewChild('boardElRef', {static: true}) boardElRef!: ElementRef<HTMLCanvasElement>;
  context!: CanvasRenderingContext2D | null;

  constructor(private cookieService: CookieService) { 
  }

  documentClick$ = fromEvent(document, 'click');
  ngOnInit() {
    this.startScreen();    
    this.cookieHightscore = this.cookieService.get('hightscore');
    
    if (this.cookieHightscore != "")
    {
      this.hightScore = parseInt(this.cookieHightscore);
    }

    this.idClick = this.documentClick$.subscribe(() => {
      if (this.currentState == StateGame.GameScreen)
      {
        this.moveBird();
      } else if (this.currentState == StateGame.StartScreen)
      {
        this.startGame();
      }
      
    })
  }

  ngOnDestroy(): void {
    this.idClick.unsubscribe();
    this.idPipes.unsubscribe();

  }  

  startScreen(): void{
    this.currentState = StateGame.StartScreen;

    this.board = this.boardElRef.nativeElement;
    this.board.height = this.boardHeight;
    this.board.width = this.boardWidth;

    this.context = this.board.getContext("2d");

    this.birdImg = new Image();
    this.birdImg.src = "/assets/flappybird.png";
    this.birdImg.onload = () => {
      this.context!.drawImage(this.birdImg, this.bird.x, this.bird.y, this.bird.width, this.bird.height);
    }
    
    this.topPipeImg = new Image();
    this.topPipeImg.src = "/assets/toppipe.png";
    
    this.bottomPipeImg = new Image();
    this.bottomPipeImg.src = "/assets/bottompipe.png";

    this.splashImg = new Image();
    this.splashImg.src = "/assets/splash.png";
    this.splashImg.onload = () => {
      this.context!.drawImage(this.splashImg, this.splashX, this.splashY, this.splashWidth, this.splashHeight);
    }
  }

  startGame(): void {
    
    this.currentState = StateGame.GameScreen;
    
    requestAnimationFrame(() => this.update());
    
    this.loopPipes = interval(1500);
    this.idPipes = this.loopPipes.subscribe(() => this.placePipes());
  }

  resetGame(): void {
    this.bird.y = this.birdY;
    this.pipeArray = [];
    this.score = 0;
    this.gameOver = false;
  }

  update(): void{
    requestAnimationFrame(() => this.update());
    if (this.gameOver){
      return;
    }

    this.context!.clearRect(0, 0, this.board.width, this.board.height);

    this.velocityY += this.gravity;

    //keep bird inside the board
    this.bird.y = Math.max(this.bird.y + this.velocityY, 5);
    this.landY = this.board.height - (this.birdHeight*3.5); 
    
    if (this.bird.y > this.landY) { 
      this.bird.y = Math.max(this.bird.y, this.landY);
      this.gameOver = true;
    }

    this.context!.drawImage(this.birdImg, this.bird.x, this.bird.y, this.bird.width, this.bird.height);

    for (let i = 0; i < this.pipeArray.length; i++) {
      let pipe = this.pipeArray[i];
      pipe.x += this.velocityX;
      this.context!.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

      if (!pipe.passed && this.bird.x > pipe.x + pipe.width) {
        this.score += 0.5;
        pipe.passed = true;
      }

      if (this.detectCollision(this.bird, pipe)) {
        this.gameOver = true;
      }
    }

    while (this.pipeArray.length > 0 && this.pipeArray[0].x < -this.pipeWidth) {
      this.pipeArray.shift();
    }

    if (this.score > this.hightScore) {
      this.hightScore = this.score;
      this.cookieService.set('hightscore', String(this.hightScore));
    }

    this.context!.fillStyle = "white";
    this.context!.font= "45px sans-serif";
    this.context!.fillText(String(this.score), 10, 45);

    if(this.gameOver) {
      this.context!.fillText("GAME OVER", this.boardWidth/8, this.boardHeight/2);
      this.context!.fillText(`Score: ${String(this.score)}`, this.boardWidth/4, this.boardHeight/1.75);
      this.context!.fillText(`Best: ${String(this.hightScore)}`, this.boardWidth/4, this.boardHeight/1.55);
    }

  }
  
  placePipes(): void{
    if (this.gameOver) {
      return;
    }

    this.randomPipeY = this.pipeY - this.pipeHeight/4 - Math.random()*(this.pipeHeight/2);
    this.openingSpace = this.board.height/4;
    
    this.bottomPipe = {
      img: this.bottomPipeImg,
      x: this.pipeX,
      y: this.randomPipeY + this.pipeHeight + this.openingSpace,
      width: this.pipeWidth,
      height: this.pipeHeight,
      passed: false
    }

    this.topPipe = {
      img: this.topPipeImg,
      x: this.pipeX,
      y: this.randomPipeY,
      width: this.pipeWidth,
      height: this.pipeHeight,
      passed: false
    }

    this.pipeArray.push(this.topPipe);   
    this.pipeArray.push(this.bottomPipe);
  }

  moveBird(): void{
    this.velocityY = -6;

    if (this.gameOver) {
      this.resetGame();
    }
  }

  detectCollision(a: BirdInterface, b: PipeInterface) {
    return a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
  }

}
