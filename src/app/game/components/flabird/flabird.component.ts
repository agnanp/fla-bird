import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BirdInterface, PipeInterface, StateGame } from '../../types/game.interface';
import { fromEvent } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-flabird',
  templateUrl: './flabird.component.html',
  styleUrls: ['./flabird.component.css']
})
export class FlabirdComponent implements OnInit, AfterViewInit, OnDestroy {

  private currentState: number = 0;
  private board!: any;
  
  private boardWidth: number = 360;
  private boardHeight: number = 640;

  //splash
  private splashImg!: any;
  private splashWidth: number = 188;
  private splashHeight: number = 170;
  private splashX: number = this.boardWidth/5;
  private splashY: number = this.boardHeight/3;

  //bird
  private birdWidth: number = 34; //width/height ratio = 408/228 = 17/12
  private birdHeight: number = 24;
  private birdX: number = this.boardWidth/8;
  private birdY: number = this.boardHeight/2;
  private birdImg!: any;
  
  private bird: BirdInterface = {
    x: this.birdX,
    y: this.birdY,
    width: this.birdWidth,
    height: this.birdHeight
  }

  //pipes
  private pipeArray: any[]= [];
  private pipeWidth: number = 64; //width/height ratio = 384/3072 = 1/8
  private pipeHeight: number = 512;
  private pipeX: number = this.boardWidth;
  private pipeY: number = 0;

  private topPipeImg!: any;
  private bottomPipeImg!: any;

  //physics
  private velocityX: number= -2; //pipes moving left speed
  private velocityY: number = 0; //bird jump speed
  private gravity: number = 0.4;

  private gameOver: boolean = false;
  private score: number = 0;
  private hightScore: number = 0;
  private cookieHightscore!: string;
  private idPipes!: any;

  @ViewChild('boardElRef') boardElRef!: ElementRef<HTMLCanvasElement>;
  context!: CanvasRenderingContext2D;

  constructor(private cookieService: CookieService) { 
  }

  documentClick$ = fromEvent(document, 'click');
  ngOnInit() {
    this.cookieHightscore = this.cookieService.get('hightscore');
    
    if (this.cookieHightscore != "")
    {
      this.hightScore = parseInt(this.cookieHightscore);
    }

    this.documentClick$.subscribe((e) => {
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
    if (this.idPipes) {
      clearInterval(this.idPipes);
    }
  }  

  ngAfterViewInit(): void {
    this.startScreen();    
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
      this.context.drawImage(this.birdImg, this.bird.x, this.bird.y, this.bird.width, this.bird.height);
    }
    
    this.topPipeImg = new Image();
    this.topPipeImg.src = "/assets/toppipe.png";
    
    this.bottomPipeImg = new Image();
    this.bottomPipeImg.src = "/assets/bottompipe.png";

    this.splashImg = new Image();
    this.splashImg.src = "/assets/splash.png";
    this.splashImg.onload = () => {
      this.context.drawImage(this.splashImg, this.splashX, this.splashY, this.splashWidth, this.splashHeight);
    }
  }

  startGame(): void {
    
    this.currentState = StateGame.GameScreen;
    
    requestAnimationFrame(() => this.update());
    
    this.idPipes = setInterval(() => {
      this.placePipes();
    }, 1500);
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

    this.context.clearRect(0, 0, this.board.width, this.board.height);

    this.velocityY += this.gravity;

    this.bird.y = Math.max(this.bird.y + this.velocityY, 0)

    this.context.drawImage(this.birdImg, this.bird.x, this.bird.y, this.bird.width, this.bird.height);

    if (this.bird.y > this.board.height) { 
      this.gameOver = true;
    }

    for (let i = 0; i < this.pipeArray.length; i++) {
      let pipe = this.pipeArray[i];
      pipe.x += this.velocityX;
      this.context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

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

    this.context.fillStyle = "white";
    this.context.font= "45px sans-serif";
    this.context.fillText(String(this.score), 5, 45);

    if(this.gameOver) {
      this.context.fillText("GAME OVER", this.boardWidth/8, this.boardHeight/2);
      this.context.fillText(`Score: ${String(this.score)}`, this.boardWidth/4, this.boardHeight/1.75);
      this.context.fillText(`Best: ${String(this.hightScore)}`, this.boardWidth/4, this.boardHeight/1.55);
    }

  }
  
  placePipes(): void{
    if (this.gameOver) {
      return;
    }

    let randomPipeY = this.pipeY - this.pipeHeight/4 - Math.random()*(this.pipeHeight/2);
    let openingSpace = this.board.height/4;

    let topPipe: PipeInterface = {
      img: this.topPipeImg,
      x: this.pipeX,
      y: randomPipeY,
      width: this.pipeWidth,
      height: this.pipeHeight,
      passed: false
    }

    this.pipeArray.push(topPipe);

    let bottomPipe: PipeInterface = {
      img: this.bottomPipeImg,
      x: this.pipeX,
      y: randomPipeY + this.pipeHeight + openingSpace,
      width: this.pipeWidth,
      height: this.pipeHeight,
      passed: false
    }
    this.pipeArray.push(bottomPipe);
  }

  moveBird(): void{
    this.velocityY = -6;

    if (this.gameOver) {
      this.resetGame();
    }
  }

  detectCollision(a: any, b: any) {
    return a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
  }

}
