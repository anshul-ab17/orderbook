export type Side = "BUY" |"SELL";

export interface Order {
    id : string;
    userId: string;
    marketId: string;

    side: Side;
    price: number;
    quantity: number;

    filled : number;
    timestamp: number;

    prev?: Order;
    next?: Order;
    level?:Pricelevel;
}

export interface Pricelevel {
    price : Number;
    head?: Order;
    tail?: Order;
    totalVolume:number;
}

export interface Trade{
    id: string;
    buyOrderId: string;
    sellOrderId: string;

    price: number;
    quantity: number;
    timeStamp: number;
}