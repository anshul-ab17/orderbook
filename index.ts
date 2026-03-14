import express from "express";
import bodyParser from "body-parser";

export const app = express();
app.use(bodyParser.json());

// asset SOL -> USDC
export const TICKER = "SOL";

// order side
// bid = buy SOL
// ask = sell SOL
type Side = "bid" | "ask";

// balances map
// { USD: 50000, SOL: 10 }
interface Balances {
  [key: string]: number;
}

interface User {
  id: string;
  balances: Balances;
}

//  order type 
interface Order<T extends number = number> {
  userId: string;
  price: T;
  quantity: T;
}

class OrderBook<T extends number> {

  // buy orders (users want to buy SOL)
  private bids: Order<T>[] = [];
  // Sell orders (users want to sell SOL)
  private asks: Order<T>[] = [];
  private users: User[];

  private orderSideMap: Record<Side, Order<T>[]> = {
    bid: this.bids,
    ask: this.asks
  };

  private oppositeSide: Record<Side, Order<T>[]> = {
    bid: this.asks,
    ask: this.bids
  };

  // ensures best price is matched first
  private sortStrategy: Record<Side, (a: Order<T>, b: Order<T>) => number> = {

    // Highest bid should match first
    bid: (a, b) => Number(a.price) - Number(b.price),

    // lowest ask should match first
    ask: (a, b) => Number(b.price) - Number(a.price)
  };

  constructor(users: User[]) {
    this.users = users;
  }

  // placing new order
  placeOrder(side: Side, price: T, quantity: T, userId: string) {

    // attempt to match existing orders
    const remaining = this.fillOrders(side, price, quantity, userId);

    // if  remaining quantity exists, add to orderbook
    const actions: Record<string, () => void> = {

      // Order fully filled
      "0": () => {},

      // Partial or no fill
      "1": () => {

        const book = this.orderSideMap[side];

        // add remaining order
        book.push({
          userId,
          price,
          quantity: remaining
        });

        // sort orderbook
        book.sort(this.sortStrategy[side]);
      }
    };
    // Return filled quantity
    return quantity - remaining;
  }

  // return aggregated orderbook depth
  getDepth() {

    const depth: Record<string, { type: Side, quantity: number }> = {};

    const aggregate = (orders: Order<T>[], type: Side) => {

      orders.forEach(o => {

        // initialize price level
        depth[o.price] ??= {
          type,
          quantity: 0
        };

        // add quantity
        depth[o.price].quantity += o.quantity;
      });
    };

    // aggregate both sides
    aggregate(this.bids, "bid");
    aggregate(this.asks, "ask");

    return depth;
  }

  getBalance(userId: string) {

    const user = this.users.find(u => u.id === userId);

    // if user not found
    return user?.balances ?? {
      USD: 0,
      [TICKER]: 0
    };
  }

  // transfer balances when trade occurs
  private flipBalance(userId1: string, userId2: string, quantity: number, price: number) {

    const user1 = this.users.find(x => x.id === userId1);
    const user2 = this.users.find(x => x.id === userId2);

    // seller gives SOL
    user1?.balances && (user1.balances[TICKER] -= quantity);

    // buyer receives SOL
    user2?.balances && (user2.balances[TICKER] += quantity);

    // seller receives USD
    user1?.balances && (user1.balances["USD"] += quantity * price);

    // buyer pays USD
    user2?.balances && (user2.balances["USD"] -= quantity * price);
  }

  // matching engine logic
  private fillOrders(side: Side, price: T, quantity: T, userId: string) {

    let remaining = quantity;

    // get opposite book
    const book = this.oppositeSide[side];

    // matching price rules
    const priceCheck: Record<Side, (p: number) => boolean> = {

      // buy order matches if ask <= bid
      bid: (p) => p <= price,

      // sell order matches if bid >= ask
      ask: (p) => p >= price
    };

    // iterate from best price
    for (let i = book.length - 1; i >= 0 && remaining > 0; i--) {

      const order = book[i];

      priceCheck[side](order.price) &&
        (() => {

          // determine trade quantity
          const tradeQty = Math.min(order.quantity, remaining);

          // identify buyer and seller
          const traders: Record<Side, [string, string]> = {
            bid: [order.userId, userId],
            ask: [userId, order.userId]
          };

          const [seller, buyer] = traders[side];

          // transfer balances
          this.flipBalance(seller, buyer, tradeQty, order.price);

          // reduce order quantity
          order.quantity -= tradeQty;

          // Rreduce remaining order
          remaining -= tradeQty;

          // remove order if filled
          !order.quantity && book.pop();
        })();
    }

    return remaining;
  }
}

// initial users with SOL/USD balances
const users: User[] = [
  { id: "1", balances: { SOL: 20, USD: 50000 } },
  { id: "2", balances: { SOL: 15, USD: 50000 } }
];

// create orderbook instance
const orderBook = new OrderBook<number>(users);

app.post("/order", (req, res) => {

  const { side, price, quantity, userId } = req.body;

  const filled = orderBook.placeOrder(side, price, quantity, userId);

  res.json({
    filledQuantity: filled
  });
});

app.get("/depth", (_req, res) => {

  res.json({
    depth: orderBook.getDepth()
  });
});

app.get("/balance/:userId", (req, res) => {

  res.json(
    orderBook.getBalance(req.params.userId)
  );
});