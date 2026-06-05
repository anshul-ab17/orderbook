import { Order , Trade } from "./types";
import {randomUUID} from "crypto";

export class TradeEngine {
    execute(
        buy:Order,
        sell:Order,
        quantity:number,
        price:number
    ): Trade {
        buy.filled+=quantity;
        sell.filled+=quantity;

        const trade:Trade = {
            id: randomUUID(),
            buyOrderId: buy.id,
            sellOrderId: sell.id,
            quantity,
            price,
            timeStamp:Date.now()
        }
        return trade;
    }
}