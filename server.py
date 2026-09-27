#!/usr/bin/env python3
"""
SNK Grocery Server - Full prototype (Customer + Admin + Delivery)
All data in CSV files. Run: python server.py
"""
import csv, json, os, uuid, base64
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 3000
DIR = os.path.dirname(os.path.abspath(__file__)) or "."

def p(name): return os.path.join(DIR, name)

def ensure_csv(fn, headers):
    if not os.path.exists(p(fn)):
        with open(p(fn), "w", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=headers).writeheader()

def read_csv(fn):
    if not os.path.exists(p(fn)): return []
    with open(p(fn), "r", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def write_csv(fn, headers, rows):
    with open(p(fn), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in headers})

def append_csv(fn, headers, row):
    rows = read_csv(fn)
    rows.append(row)
    write_csv(fn, headers, rows)

ORDER_H = ["order_id","created_at","name","phone","address","lat","lng","payment","subtotal","delivery_charge","discount","total","status","items","delivery_partner","delivered_photo","delivered_at"]
PRODUCT_H = ["id","name","category","unit","price","mrp","stock","emoji","available","rating","rating_count"]
SETTINGS_H = ["key","value"]
RATING_H = ["id","product_id","product_name","phone","name","rating","comment","created_at"]
WISHLIST_H = ["phone","product_id","added_at"]
DELIVERY_H = ["phone","name","password","active"]
LOC_H = ["order_id","lat","lng","updated_at"]

for fn, h in [("orders.csv",ORDER_H),("ratings.csv",RATING_H),("wishlist.csv",WISHLIST_H),
              ("delivery_partners.csv",DELIVERY_H),("delivery_locations.csv",LOC_H)]:
    ensure_csv(fn, h)

DEFAULT_SETTINGS = {
    "min_order": "99", "delivery_charge": "30", "free_delivery_above": "299",
    "offer_percent": "10", "offer_min": "499", "offer_text": "10% OFF on orders above ₹499",
    "helpline": "9876543210", "email": "support@snkgrocery.in",
    "store_lat": "11.8190", "store_lng": "76.6880"
}

def get_settings():
    rows = read_csv("settings.csv")
    if not rows:
        write_csv("settings.csv", SETTINGS_H, [{"key":k,"value":v} for k,v in DEFAULT_SETTINGS.items()])
        return dict(DEFAULT_SETTINGS)
    return {r["key"]: r["value"] for r in rows}

def save_settings(data):
    write_csv("settings.csv", SETTINGS_H, [{"key":k,"value":str(v)} for k,v in data.items()])

def seed():
    if not (os.path.exists(p("products.csv")) and read_csv("products.csv")):
        products = [
            {"id":"1","name":"Tomato","category":"vegetables","unit":"1 kg","price":"40","mrp":"50","stock":"50","emoji":"🍅","available":"1","rating":"4.3","rating_count":"28"},
            {"id":"2","name":"Onion","category":"vegetables","unit":"1 kg","price":"35","mrp":"45","stock":"80","emoji":"🧅","available":"1","rating":"4.1","rating_count":"19"},
            {"id":"3","name":"Potato","category":"vegetables","unit":"1 kg","price":"30","mrp":"40","stock":"100","emoji":"🥔","available":"1","rating":"4.5","rating_count":"42"},
            {"id":"4","name":"Carrot","category":"vegetables","unit":"500 g","price":"25","mrp":"30","stock":"40","emoji":"🥕","available":"1","rating":"4.2","rating_count":"15"},
            {"id":"5","name":"Green Chilli","category":"vegetables","unit":"100 g","price":"15","mrp":"20","stock":"30","emoji":"🌶️","available":"1","rating":"4.0","rating_count":"11"},
            {"id":"6","name":"Coriander","category":"vegetables","unit":"1 bunch","price":"10","mrp":"15","stock":"25","emoji":"🌿","available":"1","rating":"4.4","rating_count":"22"},
            {"id":"7","name":"Cucumber","category":"vegetables","unit":"500 g","price":"20","mrp":"25","stock":"35","emoji":"🥒","available":"1","rating":"4.1","rating_count":"9"},
            {"id":"8","name":"Cabbage","category":"vegetables","unit":"1 pc","price":"25","mrp":"30","stock":"20","emoji":"🥬","available":"1","rating":"4.0","rating_count":"7"},
            {"id":"9","name":"Capsicum","category":"vegetables","unit":"500 g","price":"45","mrp":"55","stock":"25","emoji":"🫑","available":"1","rating":"4.2","rating_count":"13"},
            {"id":"10","name":"Banana","category":"fruits","unit":"1 dozen","price":"50","mrp":"60","stock":"40","emoji":"🍌","available":"1","rating":"4.6","rating_count":"55"},
            {"id":"11","name":"Apple (Shimla)","category":"fruits","unit":"1 kg","price":"150","mrp":"180","stock":"25","emoji":"🍎","available":"1","rating":"4.4","rating_count":"31"},
            {"id":"12","name":"Orange","category":"fruits","unit":"1 kg","price":"80","mrp":"100","stock":"30","emoji":"🍊","available":"1","rating":"4.3","rating_count":"24"},
            {"id":"13","name":"Mango","category":"fruits","unit":"1 kg","price":"180","mrp":"220","stock":"15","emoji":"🥭","available":"1","rating":"4.7","rating_count":"18"},
            {"id":"14","name":"Grapes","category":"fruits","unit":"500 g","price":"90","mrp":"110","stock":"20","emoji":"🍇","available":"1","rating":"4.2","rating_count":"12"},
            {"id":"15","name":"Nandini Milk","category":"dairy","unit":"500 ml","price":"28","mrp":"30","stock":"60","emoji":"🥛","available":"1","rating":"4.8","rating_count":"90"},
            {"id":"16","name":"Curd","category":"dairy","unit":"500 g","price":"35","mrp":"40","stock":"40","emoji":"🥣","available":"1","rating":"4.5","rating_count":"33"},
            {"id":"17","name":"Amul Butter","category":"dairy","unit":"100 g","price":"58","mrp":"62","stock":"25","emoji":"🧈","available":"1","rating":"4.6","rating_count":"41"},
            {"id":"18","name":"Paneer","category":"dairy","unit":"200 g","price":"85","mrp":"95","stock":"20","emoji":"🧀","available":"1","rating":"4.4","rating_count":"27"},
            {"id":"19","name":"Farm Eggs","category":"dairy","unit":"6 pcs","price":"42","mrp":"48","stock":"50","emoji":"🥚","available":"1","rating":"4.5","rating_count":"38"},
            {"id":"20","name":"Sona Masuri Rice","category":"staples","unit":"5 kg","price":"320","mrp":"360","stock":"30","emoji":"🍚","available":"1","rating":"4.7","rating_count":"64"},
            {"id":"21","name":"Toor Dal","category":"staples","unit":"1 kg","price":"145","mrp":"165","stock":"40","emoji":"🟡","available":"1","rating":"4.3","rating_count":"29"},
            {"id":"22","name":"Atta","category":"staples","unit":"5 kg","price":"265","mrp":"290","stock":"35","emoji":"🌾","available":"1","rating":"4.5","rating_count":"47"},
            {"id":"23","name":"Sugar","category":"staples","unit":"1 kg","price":"45","mrp":"50","stock":"50","emoji":"🧂","available":"1","rating":"4.2","rating_count":"20"},
            {"id":"24","name":"Sunflower Oil","category":"staples","unit":"1 L","price":"145","mrp":"165","stock":"28","emoji":"🛢️","available":"1","rating":"4.4","rating_count":"35"},
            {"id":"25","name":"Parle-G","category":"snacks","unit":"1 pack","price":"10","mrp":"12","stock":"80","emoji":"🍪","available":"1","rating":"4.6","rating_count":"110"},
            {"id":"26","name":"Lays Chips","category":"snacks","unit":"1 pack","price":"20","mrp":"25","stock":"45","emoji":"🥔","available":"1","rating":"4.3","rating_count":"52"},
            {"id":"27","name":"Dairy Milk","category":"snacks","unit":"1 bar","price":"40","mrp":"45","stock":"40","emoji":"🍫","available":"1","rating":"4.7","rating_count":"78"},
            {"id":"28","name":"Red Label Tea","category":"beverages","unit":"250 g","price":"95","mrp":"115","stock":"30","emoji":"🍵","available":"1","rating":"4.5","rating_count":"44"},
            {"id":"29","name":"Coca Cola","category":"beverages","unit":"750 ml","price":"40","mrp":"45","stock":"40","emoji":"🥤","available":"1","rating":"4.4","rating_count":"61"},
            {"id":"30","name":"Mineral Water","category":"beverages","unit":"1 L","price":"20","mrp":"25","stock":"50","emoji":"💧","available":"1","rating":"4.1","rating_count":"25"},
            {"id":"31","name":"Colgate","category":"personal","unit":"1 tube","price":"55","mrp":"65","stock":"30","emoji":"🪥","available":"1","rating":"4.5","rating_count":"39"},
            {"id":"32","name":"Lux Soap","category":"personal","unit":"1 pc","price":"32","mrp":"38","stock":"45","emoji":"🧼","available":"1","rating":"4.3","rating_count":"28"},
            {"id":"33","name":"Surf Excel","category":"personal","unit":"1 kg","price":"95","mrp":"115","stock":"30","emoji":"🫧","available":"1","rating":"4.6","rating_count":"50"},
        ]
        write_csv("products.csv", PRODUCT_H, products)
    if not read_csv("delivery_partners.csv"):
        write_csv("delivery_partners.csv", DELIVERY_H, [{"phone":"9000000001","name":"Ramesh Delivery","password":"1234","active":"1"}])

seed()
get_settings()

class Handler(SimpleHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._cors()
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(n).decode("utf-8") or "{}")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        path_, qs = u.path, parse_qs(u.query)

        if path_ == "/api/settings":
            self._json(200, get_settings()); return
        if path_ == "/api/products":
            rows = read_csv("products.csv")
            for r in rows:
                r["id"] = int(r["id"]); r["price"] = float(r.get("price") or 0)
                r["mrp"] = float(r.get("mrp") or 0); r["stock"] = int(float(r.get("stock") or 0))
                r["available"] = r.get("available") == "1"
                r["rating"] = float(r.get("rating") or 0); r["rating_count"] = int(float(r.get("rating_count") or 0))
            self._json(200, rows); return
        if path_ == "/api/orders":
            orders = read_csv("orders.csv")
            phone = qs.get("phone", [None])[0]
            if phone: orders = [o for o in orders if o.get("phone") == phone]
            for o in orders:
                try: o["items"] = json.loads(o.get("items") or "[]")
                except: o["items"] = []
            orders.reverse()
            self._json(200, orders); return
        if path_.startswith("/api/orders/") and path_.endswith("/location"):
            oid = path_.split("/")[3]
            locs = [l for l in read_csv("delivery_locations.csv") if l.get("order_id") == oid]
            self._json(200, locs[-1] if locs else {}); return
        if path_ == "/api/ratings":
            rows = read_csv("ratings.csv")
            pid = qs.get("product_id", [None])[0]
            if pid: rows = [r for r in rows if r.get("product_id") == str(pid)]
            rows.reverse(); self._json(200, rows); return
        if path_ == "/api/wishlist":
            phone = qs.get("phone", [None])[0]
            rows = read_csv("wishlist.csv")
            if phone: rows = [r for r in rows if r.get("phone") == phone]
            self._json(200, rows); return
        if path_ == "/api/delivery/partners":
            self._json(200, read_csv("delivery_partners.csv")); return
        super().do_GET()

    def do_POST(self):
        path_ = urlparse(self.path).path
        data = self._body()

        if path_ == "/api/orders":
            oid = "SNK" + datetime.now().strftime("%y%m%d") + uuid.uuid4().hex[:5].upper()
            order = {
                "order_id": oid, "created_at": datetime.now().isoformat(timespec="seconds"),
                "name": data.get("name",""), "phone": data.get("phone",""),
                "address": data.get("address",""), "lat": str(data.get("lat") or ""),
                "lng": str(data.get("lng") or ""), "payment": data.get("payment","COD"),
                "subtotal": str(data.get("subtotal") or 0),
                "delivery_charge": str(data.get("delivery_charge") or 0),
                "discount": str(data.get("discount") or 0),
                "total": str(data.get("total") or 0), "status": "New",
                "items": json.dumps(data.get("items",[]), ensure_ascii=False),
                "delivery_partner": "", "delivered_photo": "", "delivered_at": ""
            }
            rows = read_csv("orders.csv"); rows.append(order)
            write_csv("orders.csv", ORDER_H, rows)
            print(f"[ORDER] {oid}"); self._json(201, {"order_id": oid, "status": "New"}); return

        if path_ == "/api/ratings":
            rid = "R" + uuid.uuid4().hex[:8].upper()
            row = {"id":rid,"product_id":str(data.get("product_id","")),"product_name":data.get("product_name",""),
                   "phone":data.get("phone",""),"name":data.get("name",""),"rating":str(data.get("rating",5)),
                   "comment":data.get("comment",""),"created_at":datetime.now().isoformat(timespec="seconds")}
            append_csv("ratings.csv", RATING_H, row)
            products = read_csv("products.csv")
            for pr in products:
                if pr["id"] == str(data.get("product_id")):
                    cnt = int(float(pr.get("rating_count") or 0)) + 1
                    old = float(pr.get("rating") or 0); new_r = float(data.get("rating",5))
                    pr["rating"] = str(round(((old*(cnt-1))+new_r)/cnt,1) if cnt>1 else new_r)
                    pr["rating_count"] = str(cnt); break
            write_csv("products.csv", PRODUCT_H, products)
            self._json(201, row); return

        if path_ == "/api/wishlist":
            phone, pid = data.get("phone",""), str(data.get("product_id",""))
            rows = read_csv("wishlist.csv")
            if not any(r["phone"]==phone and r["product_id"]==pid for r in rows):
                rows.append({"phone":phone,"product_id":pid,"added_at":datetime.now().isoformat(timespec="seconds")})
                write_csv("wishlist.csv", WISHLIST_H, rows)
            self._json(201, {"ok":True}); return

        if path_ == "/api/delivery/login":
            for d in read_csv("delivery_partners.csv"):
                if d["phone"]==data.get("phone") and d["password"]==data.get("password"):
                    self._json(200, {"ok":True,"name":d["name"],"phone":d["phone"]}); return
            self._json(401, {"error":"Invalid login"}); return

        if path_ == "/api/delivery/location":
            append_csv("delivery_locations.csv", LOC_H, {
                "order_id": data.get("order_id",""), "lat": str(data.get("lat","")),
                "lng": str(data.get("lng","")), "updated_at": datetime.now().isoformat(timespec="seconds")
            })
            self._json(200, {"ok":True}); return

        if path_ == "/api/delivery/complete":
            oid = data.get("order_id","")
            rows = read_csv("orders.csv")
            for o in rows:
                if o["order_id"] == oid:
                    o["status"] = "Delivered"
                    o["delivered_photo"] = (data.get("photo") or "")[:400]
                    o["delivered_at"] = datetime.now().isoformat(timespec="seconds")
                    break
            write_csv("orders.csv", ORDER_H, rows)
            self._json(200, {"ok":True}); return

        self.send_error(404)

    def do_PUT(self):
        path_ = urlparse(self.path).path
        data = self._body()
        if path_ == "/api/settings":
            cur = get_settings(); cur.update({k:str(v) for k,v in data.items()})
            save_settings(cur); self._json(200, cur); return
        if path_.startswith("/api/orders/") and path_.endswith("/status"):
            oid = path_.split("/")[3]
            rows = read_csv("orders.csv")
            for o in rows:
                if o["order_id"] == oid:
                    o["status"] = data.get("status", o["status"])
                    if data.get("delivery_partner"): o["delivery_partner"] = data["delivery_partner"]
                    break
            write_csv("orders.csv", ORDER_H, rows); self._json(200, {"ok":True}); return
        if path_.startswith("/api/products/"):
            pid = path_.split("/")[3]
            rows = read_csv("products.csv")
            for pr in rows:
                if pr["id"] == pid:
                    for k in ["name","category","unit","price","mrp","stock","emoji"]:
                        if k in data: pr[k] = str(data[k])
                    if "available" in data: pr["available"] = "1" if data["available"] else "0"
                    break
            write_csv("products.csv", PRODUCT_H, rows); self._json(200, {"ok":True}); return
        self.send_error(404)

    def do_DELETE(self):
        u = urlparse(self.path)
        if u.path == "/api/wishlist":
            qs = parse_qs(u.query)
            phone, pid = qs.get("phone",[""])[0], qs.get("product_id",[""])[0]
            rows = [r for r in read_csv("wishlist.csv") if not (r["phone"]==phone and r["product_id"]==pid)]
            write_csv("wishlist.csv", WISHLIST_H, rows); self._json(200, {"ok":True}); return
        self.send_error(404)

    def log_message(self, fmt, *args):
        if "/api/" in str(args[0]): print(args[0])

if __name__ == "__main__":
    os.chdir(DIR)
    print("="*52)
    print("  SNK Grocery Server (Full Prototype)")
    print("="*52)
    print(f"  Customer  : http://localhost:{PORT}")
    print(f"  Admin     : http://localhost:{PORT}/admin.html")
    print(f"  Delivery  : http://localhost:{PORT}/delivery.html")
    print("="*52)
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
