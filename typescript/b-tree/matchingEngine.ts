import { OrderBook } from "./orderBook";
import { TradeEngine } from "./tradeEngine";
import type { Order, Trade } from "./types"; 

export class MatchingEngine {
  private books =
    new Map<string, OrderBook>();

  private tradeEngine =
    new TradeEngine();

  private getBook(
    marketId: string
  ): OrderBook {
    let book =
      this.books.get(marketId);

    if (!book) {
      book = new OrderBook();

      this.books.set(
        marketId,
        book
      );
    }

    return book;
  }

  private matchBuy(
    incoming: Order,
    book: OrderBook,
    trades: Trade[]
  ): void {
    while (
      incoming.filled <
      incoming.quantity
    ) {
      const bestAsk =
        book.getBestAskLevel();

      if (!bestAsk?.head) {
        break;
      }

      if (
        incoming.price <
        bestAsk.price
      ) {
        break;
      }

      const resting =
        bestAsk.head;

      const quantity =
        Math.min(
          incoming.quantity -
            incoming.filled,

          resting.quantity -
            resting.filled
        );

      const trade =
        this.tradeEngine.execute(
          incoming,
          resting,
          quantity,
          resting.price
        );

      trades.push(trade);

      if (
        resting.filled ===
        resting.quantity
      ) {
        book.cancel(resting.id);
      }
    }
  }

  private matchSell(
    incoming: Order,
    book: OrderBook,
    trades: Trade[]
  ): void {
    while (
      incoming.filled <
      incoming.quantity
    ) {
      const bestBid =
        book.getBestBidLevel();

      if (!bestBid?.head) {
        break;
      }

      if (
        incoming.price >
        bestBid.price
      ) {
        break;
      }

      const resting =
        bestBid.head;

      const quantity =
        Math.min(
          incoming.quantity -
            incoming.filled,

          resting.quantity -
            resting.filled
        );

      const trade =
        this.tradeEngine.execute(
          resting,
          incoming,
          quantity,
          resting.price
        );

      trades.push(trade);

      if (
        resting.filled ===
        resting.quantity
      ) {
        book.cancel(resting.id);
      }
    }
  }

  process(
    order: Order
  ): {
    trades: Trade[];
    filledQty: number;
    remainingQty: number;
  } {
    const book =
      this.getBook(
        order.marketId
      );

    const trades: Trade[] = [];

    if (
      order.side === "BUY"
    ) {
      this.matchBuy(
        order,
        book,
        trades
      );
    } else {
      this.matchSell(
        order,
        book,
        trades
      );
    }

    if (
      order.filled <
      order.quantity
    ) {
      book.add(order);
    }

    return {
      trades,

      filledQty:
        order.filled,

      remainingQty:
        order.quantity -
        order.filled,
    };
  }

  cancelOrder(
    marketId: string,
    orderId: string
  ): boolean {
    const book =
      this.books.get(marketId);

    if (!book) {
      return false;
    }

    return book.cancel(orderId);
  }

  getSnapshot(
    marketId: string
  ) {
    const book =
      this.books.get(marketId);

    if (!book) {
      return {
        bestBid: null,
        bestAsk: null,
      };
    }

    return {
      bestBid:
        book.getBestBid(),

      bestAsk:
        book.getBestAsk(),
    };
  }
}