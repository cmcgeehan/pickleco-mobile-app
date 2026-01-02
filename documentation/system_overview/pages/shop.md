# Pro Shop

This document covers the pro shop e-commerce functionality.

## Overview

**Base URL:** `/shop`

The pro shop (`/shop`) sells:
- Paddles
- Merchandise (shirts, hats, etc.)
- Accessories (balls, bags, grips)

Payments are processed via [Stripe Checkout](../integrations/stripe.md) and recorded in the [payments table](../data/schema.md#payments) with `payment_type = 'pro_shop'`.

## Shop Structure

```
/shop
├── page.tsx           # Product listing
├── cart/
│   └── page.tsx       # Shopping cart
├── checkout/
│   └── page.tsx       # Checkout flow
├── order-success/
│   └── page.tsx       # Order confirmation
└── product/
    └── [id]/
        └── page.tsx   # Product detail
```

---

## Product Model

Products are stored in the database:

| Field | Description |
|-------|-------------|
| `id` | Product UUID |
| `name` | Product name |
| `description` | Product description |
| `price_mxn` | Price in MXN |
| `image_path` | Product image URL |
| `category` | Product category |
| `in_stock` | Boolean - is it available? |
| `is_presale` | Boolean - pre-order only |
| `inventory_count` | Number available |

---

## Pre-sale vs Regular Sale

| Type | `is_presale` | `in_stock` | Behavior |
|------|-------------|-----------|----------|
| Pre-sale | true | false | "Pre-order" button, ships later |
| In Stock | false | true | "Add to Cart" button, ships now |
| Out of Stock | false | false | "Out of Stock" disabled |

**Pre-sale items:**
- Player can order even without physical inventory
- Shown with "Pre-order" messaging
- Ships when inventory arrives

---

## Shopping Cart

Cart stored in local storage:
```typescript
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

// Local storage key
localStorage.setItem('cart', JSON.stringify(cartItems))
```

Cart page (`/shop/cart`):
- View items
- Adjust quantities
- Remove items
- See total
- Proceed to checkout (requires [authentication](./auth.md))

---

## Checkout Flow

Uses [Stripe Checkout](../integrations/stripe.md):

```
1. User views cart
2. Clicks "Checkout" (requires [login](./auth.md))
3. Frontend calls API to create [Stripe Checkout session](../integrations/stripe.md)
4. User redirected to Stripe Checkout
5. User enters payment details
6. Payment processed
7. Redirect to /shop/order-success
8. Order recorded in [payments table](../data/schema.md#payments)
```

### API: Create Checkout Session

```typescript
// POST /api/shop/checkout
{
  items: CartItem[],
  customer_email?: string
}

// Response
{
  sessionId: string,
  url: string  // Stripe checkout URL
}
```

### Stripe Checkout Configuration

Uses [Stripe](../integrations/stripe.md) to create checkout session:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: items.map(item => ({
    price_data: {
      currency: 'mxn',
      product_data: {
        name: item.name,
        images: [item.imageUrl],
      },
      unit_amount: item.price * 100,  // Convert to centavos
    },
    quantity: item.quantity,
  })),
  success_url: `${baseUrl}/shop/order-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/shop/cart`,
})
```

---

## Order Success

After successful payment:

1. [Stripe](../integrations/stripe.md) redirects to `/shop/order-success?session_id=xxx`
2. Page fetches session details from Stripe
3. Displays confirmation:
   - Order number
   - Items purchased
   - Total amount
   - Shipping info (if applicable)

### Order Recording

[Webhook](../integrations/stripe.md#webhooks) (`/api/webhook`) handles `checkout.session.completed`:
- Creates record in [payments table](../data/schema.md#payments) with `payment_type = 'pro_shop'`
- Updates inventory
- Sends confirmation email (via Resend if configured)

---

## Product Management

**Currently:** Products managed directly in database.

**Future:** [Admin interface](../users/admin.md) for:
- Adding products
- Editing prices/descriptions
- Managing inventory
- Marking items as pre-sale

---

## API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/shop/products` | List all products |
| `GET /api/shop/products/[id]` | Get product details |
| `POST /api/shop/checkout` | Create [Stripe](../integrations/stripe.md) checkout session |

---

## Authentication

- Product browsing: No auth required
- Adding to cart: No auth required (stored in localStorage)
- Checkout: Requires [login](./auth.md)
- Uses [Supabase auth](../integrations/supabase.md)

---

## Missing Functionality

- [ ] [Admin](../users/admin.md) product management UI
- [ ] Inventory tracking on purchase
- [ ] Order history for users (in [/account](./account.md))
- [ ] Shipping integration
- [ ] Tax calculation
- [ ] Discount codes/coupons
- [ ] Product variants (sizes, colors)
- [ ] Reviews/ratings

---

## Related Documentation

- [./auth.md](./auth.md) - Authentication (required for checkout)
- [./account.md](./account.md) - User order history (future)
- [../integrations/stripe.md](../integrations/stripe.md) - Payment processing
- [../integrations/supabase.md](../integrations/supabase.md) - Database
- [../data/schema.md](../data/schema.md) - Payments table
- [../users/admin.md](../users/admin.md) - Admin capabilities
- [../users/player.md](../users/player.md) - Player shopping journey
