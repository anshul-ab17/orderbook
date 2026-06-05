import { BTree } from "sorted-btree";

import type { Order } from "./types";
import { Level } from "./priceLevel";

export class OrderBook {
  // sorted levels

  private bids =
    new BTree<number, Level>();

  private asks =
    new BTree<number, Level>();

  // O(1) order lookup

  private orderMap =
    new Map<string, Order>();

  // O(1) price lookup

  private bidLevels =
    new Map<number, Level>();

  private askLevels =
    new Map<number, Level>();

  add(order: Order): void {
    const tree =
      order.side === "BUY"
        ? this.bids
        : this.asks;

    const levelMap =
      order.side === "BUY"
        ? this.bidLevels
        : this.askLevels;

    let level =
      levelMap.get(order.price);

    if (!level) {
      level = new Level(order.price);

      tree.set(order.price, level);

      levelMap.set(
        order.price,
        level
      );
    }

    level.append(order);

    this.orderMap.set(
      order.id,
      order
    );
  }

  cancel(orderId: string): boolean {
    const order =
      this.orderMap.get(orderId);

    if (!order) {
      return false;
    }

    const level = order.level!;

    level.remove(order);

    if (level.isEmpty()) {
      const tree =
        order.side === "BUY"
          ? this.bids
          : this.asks;

      const levelMap =
        order.side === "BUY"
          ? this.bidLevels
          : this.askLevels;

      tree.delete(level.price);

      levelMap.delete(level.price);
    }

    this.orderMap.delete(orderId);

    return true;
  }

  getOrder(
    orderId: string
  ): Order | undefined {
    return this.orderMap.get(
      orderId
    );
  }

  getBestBidLevel():
    | Level
    | undefined {
    const price =
      this.bids.maxKey();

    if (price === undefined) {
      return undefined;
    }

    return this.bids.get(price);
  }

  getBestAskLevel():
    | Level
    | undefined {
    const price =
      this.asks.minKey();

    if (price === undefined) {
      return undefined;
    }

    return this.asks.get(price);
  }

  getBestBid():
    | number
    | undefined {
    return this.bids.maxKey();
  }

  getBestAsk():
    | number
    | undefined {
    return this.asks.minKey();
  }
}