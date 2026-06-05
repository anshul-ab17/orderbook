import type { Order } from "./types";

export class Level {
  public head?: Order;
  public tail?: Order;

  public totalVolume = 0;

  constructor(
    public readonly price: number
  ) {}

  append(order: Order): void {
    order.level = this;

    if (!this.head) {
      this.head = order;
      this.tail = order;
    } else {
      order.prev = this.tail;

      this.tail!.next = order;
      this.tail = order;
    }

    this.totalVolume +=
      order.quantity - order.filled;
  }

  remove(order: Order): void {
    if (order.prev) {
      order.prev.next = order.next;
    }

    if (order.next) {
      order.next.prev = order.prev;
    }

    if (this.head === order) {
      this.head = order.next;
    }

    if (this.tail === order) {
      this.tail = order.prev;
    }

    this.totalVolume -=
      order.quantity - order.filled;

    order.prev = undefined;
    order.next = undefined;
    order.level = undefined;
  }

  isEmpty(): boolean {
    return this.head === undefined;
  }
}