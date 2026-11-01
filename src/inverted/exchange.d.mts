export const EXCHANGE_CENTERS:number[];
export function exchangeAngle(time:number,delay?:number,width?:number):number;
export interface ExchangeState {time:number;activeDay:boolean;daylight:number;transition:boolean;progress:number;fromDay:boolean;toDay:boolean;direction:number;height:number;pitch:number;actorAngle:number;worldAngle:number;backgroundAngle:number;duckHeight:number;swanHeight:number;routeOffset:number;heroFocus:number;separation:number;weaveAdvance:number;duckFlap:number;swanFlap:number;flapClock:number;submerged:boolean;}
export function exchangeAt(time:number):ExchangeState;
