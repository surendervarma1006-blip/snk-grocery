# SNK Grocery – Full Prototype (Gundlupet)

## How to run (Windows)

1. Extract the zip → open `snk-web` folder
2. In the folder address bar type `cmd` and press Enter
3. Run:

```
python server.py
```

4. Open browser:

| Role | URL |
|------|-----|
| **Customer** | http://localhost:3000 |
| **Admin** | http://localhost:3000/admin.html |
| **Delivery Partner** | http://localhost:3000/delivery.html |

## Demo logins

- **Delivery Partner**: phone `9000000001` / password `1234`

## Features

### Customer
- Login / Logout
- Category filters + search
- Wishlist
- Cart with delivery charges, offers, minimum order
- Use current location for address
- Place COD order + order tracking
- Live map when Out for Delivery
- Ratings & reviews
- Offers popup
- Help (phone, email, WhatsApp)

### Admin
- Orders (New / Pending / Completed) + revenue
- Change status + assign delivery partner
- Edit product price, stock, availability
- Edit delivery charge, min order, offers, helpline
- Ratings dashboard

### Delivery Partner
- Login, share live GPS, mark Out for Delivery
- Upload delivery photo + complete order

All data saved in CSV files in the same folder.
