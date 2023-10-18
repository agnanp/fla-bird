export interface BirdInterface {
    x: number,
    y: number,
    width: number,
    height: number
}

export interface PipeInterface {
    img: any;
    x: number;
    y: number;
    width: number;
    height: number;
    passed: boolean;        
}

export enum StateGame {
    StartScreen= 0,
    GameScreen = 1,
    GameOver = 2
}