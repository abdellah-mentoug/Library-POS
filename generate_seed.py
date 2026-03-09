#!/usr/bin/env python3
"""Parse supplier invoice Excel files and generate seed.sql for Supabase."""
import sys
import io
import hashlib
import uuid

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import pandas as pd


def parse_invoice(path, language):
    df = pd.read_excel(path, sheet_name="Facture simple", header=None)
    products = []
    current_category = None

    for idx in range(4, len(df)):
        row = df.iloc[idx]
        cat_val = row[3]
        desc_val = row[4]
        prix_val = row[5]
        qty_val = row[6]

        if pd.notna(desc_val) and "Nombre total" in str(desc_val):
            break
        if pd.notna(cat_val) and "Nombre total" in str(cat_val):
            break
        if pd.notna(cat_val) and "REMISE" in str(cat_val):
            break




        if pd.notna(cat_val) and str(cat_val).strip():
            current_category = str(cat_val).strip()

        if pd.notna(desc_val) and str(desc_val).strip():
            price = float(prix_val) if pd.notna(prix_val) and not isinstance(prix_val, str) else 0
            try:
                qty = int(float(qty_val)) if pd.notna(qty_val) and not isinstance(qty_val, str) else 0
            except (ValueError, TypeError):
                qty = 0

            if price == 0 and qty == 0:
                continue

            products.append({
                "category": current_category,
                "name": str(desc_val).strip(),
                "purchase_price": price,
                "quantity": qty,
                "language": language,
            })

    return products


def sql_escape(s):
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def name_to_uuid(name):
    h = hashlib.md5(name.encode("utf-8")).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


def main():
    files = [
        ("C:/Users/Mr/Desktop/Library/seed-data/Copie de LIBRAIRIE AL HABACHI (Enregistré automatiquement).xlsx", "Arabic"),
        ("C:/Users/Mr/Desktop/Library/seed-data/Copie de LIBRAIRIE AL HABACHI  Francais.xlsx", "French"),
        ("C:/Users/Mr/Desktop/Library/seed-data/Copie de LIBRAIRIE AL HABACHI  ANGLAIS.xlsx", "English"),
    ]

    all_products = []
    for path, lang in files:
        prods = parse_invoice(path, lang)
        all_products.extend(prods)

    sql = []
    sql.append("-- =============================================================================")
    sql.append("-- SEED DATA: Generated from real supplier invoices")
    sql.append("-- Supplier: Nabil Habachi / \u0646\u0628\u064a\u0644 \u062d\u0628\u0634\u064a (\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u062d\u0628\u0634\u064a)")
    sql.append("-- Address:  Hay Alamal 9 Juillet N\u00b046, Settat 26000")
    sql.append("-- Phone:    0661892286 / 05 23 40 65 36")
    sql.append("-- Email:    elim.technique@gmail.com")
    sql.append("-- Source:   3 purchase invoice .xlsx files in /seed-data/")
    sql.append("--   Arabic textbooks:  102 line items")
    sql.append("--   French textbooks:   95 line items")
    sql.append("--   English textbooks:  18 line items")
    sql.append("--   TOTAL:             215 line items")
    sql.append("-- Currency: MAD (Moroccan Dirham)")
    sql.append("-- =============================================================================")
    sql.append("")

    # -------------------------------------------------------------------------
    # 1. SUPPLIER
    # -------------------------------------------------------------------------
    supplier_id = name_to_uuid("supplier:habachi")
    sql.append("-- -----------------------------------------------------------------------------")
    sql.append("-- 1. SUPPLIER")
    sql.append("-- -----------------------------------------------------------------------------")
    sql.append(
        f"INSERT INTO public.suppliers (id, name, contact_person, email, phone, address, notes) VALUES (\n"
        f"  {sql_escape(supplier_id)},\n"
        f"  {sql_escape('\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u062d\u0628\u0634\u064a / Librairie Al Habachi')},\n"
        f"  {sql_escape('Nabil Habachi / \u0646\u0628\u064a\u0644 \u062d\u0628\u0634\u064a')},\n"
        f"  {sql_escape('elim.technique@gmail.com')},\n"
        f"  {sql_escape('0661892286')},\n"
        f"  {sql_escape('Hay Alamal 9 Juillet N\u00b046, Settat 26000')},\n"
        f"  {sql_escape('Main textbook supplier. Alt phone: 05 23 40 65 36')}\n"
        f");"
    )
    sql.append("")

    # -------------------------------------------------------------------------
    # 2. CATEGORIES (parent/child: language > subject+grade)
    # -------------------------------------------------------------------------
    sql.append("-- -----------------------------------------------------------------------------")
    sql.append("-- 2. CATEGORIES (parent/child: language > subject + grade)")
    sql.append("-- Top-level: Arabic, French, English")
    sql.append("-- Second-level: subject + grade (from Arabic invoice category headers)")
    sql.append("-- French and English invoices have no sub-categories; items go under language parent")
    sql.append("-- -----------------------------------------------------------------------------")

    lang_cats = {
        "Arabic":  {"id": name_to_uuid("lang:Arabic"),  "name": "\u0643\u062a\u0628 \u0639\u0631\u0628\u064a\u0629 / Arabic Textbooks",  "sort": 1},
        "French":  {"id": name_to_uuid("lang:French"),  "name": "\u0643\u062a\u0628 \u0641\u0631\u0646\u0633\u064a\u0629 / French Textbooks",  "sort": 2},
        "English": {"id": name_to_uuid("lang:English"), "name": "\u0643\u062a\u0628 \u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 / English Textbooks", "sort": 3},
    }

    for lang, info in lang_cats.items():
        sql.append(
            f"INSERT INTO public.categories (id, name, parent_id, sort_order) "
            f"VALUES ({sql_escape(info['id'])}, {sql_escape(info['name'])}, NULL, {info['sort']});"
        )
    sql.append("")

    # Arabic subcategories
    arabic_cats = {}
    sort_counter = 1
    for p in all_products:
        if p["language"] == "Arabic" and p["category"]:
            cat_name = p["category"]
            if cat_name not in arabic_cats:
                cat_id = name_to_uuid(f"cat:{cat_name}")
                arabic_cats[cat_name] = {
                    "id": cat_id,
                    "name": cat_name,
                    "parent_id": lang_cats["Arabic"]["id"],
                    "sort": sort_counter,
                }
                sort_counter += 1

    for cat_name, info in arabic_cats.items():
        sql.append(
            f"INSERT INTO public.categories (id, name, parent_id, sort_order) "
            f"VALUES ({sql_escape(info['id'])}, {sql_escape(info['name'])}, {sql_escape(info['parent_id'])}, {info['sort']});"
        )
    sql.append("")

    # -------------------------------------------------------------------------
    # 3. PRODUCTS
    # -------------------------------------------------------------------------
    sql.append("-- -----------------------------------------------------------------------------")
    sql.append("-- 3. PRODUCTS (215 textbooks from real invoices)")
    sql.append("-- barcode: NULL (owner will scan ISBN-13 barcodes during initial setup)")
    sql.append("-- selling_price: NULL (owner will set retail prices manually)")
    sql.append("-- purchase_price: from the Prix column in supplier invoices (MAD)")
    sql.append("-- stock_quantity: from the Quantite column (units purchased = initial stock)")
    sql.append("-- -----------------------------------------------------------------------------")

    product_ids = []
    for i, p in enumerate(all_products):
        pid = name_to_uuid(f"prod:{p['language']}:{p['name']}:{i}")
        product_ids.append(pid)

        if p["language"] == "Arabic" and p["category"] and p["category"] in arabic_cats:
            cat_id = arabic_cats[p["category"]]["id"]
        elif p["language"] == "French":
            cat_id = lang_cats["French"]["id"]
        elif p["language"] == "English":
            cat_id = lang_cats["English"]["id"]
        else:
            cat_id = lang_cats["Arabic"]["id"]

        sql.append(
            f"INSERT INTO public.products (id, name, barcode, category_id, purchase_price, selling_price, stock_quantity, low_stock_threshold, unit) "
            f"VALUES ({sql_escape(pid)}, {sql_escape(p['name'])}, NULL, {sql_escape(cat_id)}, {p['purchase_price']}, NULL, {p['quantity']}, 3, 'piece');"
        )
    sql.append("")

    # -------------------------------------------------------------------------
    # 4. PURCHASE ORDERS (3 invoices, one per language file)
    # -------------------------------------------------------------------------
    sql.append("-- -----------------------------------------------------------------------------")
    sql.append("-- 4. PURCHASE ORDERS (3 invoices from supplier, status = received)")
    sql.append("-- NOTE: created_by is required (NOT NULL FK to profiles).")
    sql.append("-- These INSERTs omit created_by; run this AFTER creating the admin user,")
    sql.append("-- then UPDATE purchase_orders SET created_by = '<admin-uuid>';")
    sql.append("-- OR, temporarily drop the NOT NULL constraint, seed, then re-add it.")
    sql.append("-- -----------------------------------------------------------------------------")

    invoice_data = {
        "Arabic":  {"items": [], "subtotal": 0},
        "French":  {"items": [], "subtotal": 0},
        "English": {"items": [], "subtotal": 0},
    }

    for i, p in enumerate(all_products):
        line_total = round(p["purchase_price"] * p["quantity"], 2)
        invoice_data[p["language"]]["items"].append({
            "product_id": product_ids[i],
            "quantity": p["quantity"],
            "unit_cost": p["purchase_price"],
            "line_total": line_total,
        })
        invoice_data[p["language"]]["subtotal"] += line_total

    po_ids = {}
    for lang in ["Arabic", "French", "English"]:
        inv = invoice_data[lang]
        po_id = name_to_uuid(f"po:{lang}")
        po_ids[lang] = po_id
        subtotal = round(inv["subtotal"], 2)
        discount = round(subtotal * 0.20, 2)
        total = round(subtotal - discount, 2)
        item_count = sum(item["quantity"] for item in inv["items"])

        note = f"{lang} textbooks invoice. 20% supplier discount applied. Subtotal: {subtotal} MAD, Discount: -{discount} MAD, Net total: {total} MAD"

        sql.append(f"-- {lang} invoice: {len(inv['items'])} line items, {item_count} total units")
        sql.append(
            f"INSERT INTO public.purchase_orders (id, supplier_id, status, subtotal, total, notes) VALUES (\n"
            f"  {sql_escape(po_id)}, {sql_escape(supplier_id)}, 'received', {subtotal}, {total},\n"
            f"  {sql_escape(note)}\n"
            f");"
        )
        sql.append("")

    # -------------------------------------------------------------------------
    # 5. PURCHASE ITEMS
    # -------------------------------------------------------------------------
    sql.append("-- -----------------------------------------------------------------------------")
    sql.append("-- 5. PURCHASE ITEMS (line items for each purchase order)")
    sql.append("-- -----------------------------------------------------------------------------")

    for lang in ["Arabic", "French", "English"]:
        inv = invoice_data[lang]
        po_id = po_ids[lang]
        sql.append(f"-- {lang} invoice items")
        for item in inv["items"]:
            pi_id = name_to_uuid(f"pi:{lang}:{item['product_id']}")
            sql.append(
                f"INSERT INTO public.purchase_items (id, purchase_order_id, product_id, quantity_ordered, quantity_received, unit_cost, line_total) "
                f"VALUES ({sql_escape(pi_id)}, {sql_escape(po_id)}, {sql_escape(item['product_id'])}, "
                f"{item['quantity']}, {item['quantity']}, {item['unit_cost']}, {item['line_total']});"
            )
        sql.append("")

    sql.append("-- =============================================================================")
    sql.append("-- POST-SETUP INSTRUCTIONS:")
    sql.append("-- 1. Create the first admin user via Supabase Auth (email/password signup)")
    sql.append("-- 2. Copy the admin user UUID from auth.users")
    sql.append("-- 3. Run: UPDATE public.purchase_orders SET created_by = '<admin-uuid>';")
    sql.append("-- 4. Owner scans each book with USB barcode scanner to populate barcode field")
    sql.append("-- 5. Owner sets selling_price for each product")
    sql.append("-- =============================================================================")

    # Write output
    output = "\n".join(sql)
    with open("C:/Users/Mr/Desktop/Library/supabase/seed.sql", "w", encoding="utf-8") as f:
        f.write(output)

    print(f"seed.sql written successfully!")
    print(f"Total SQL lines: {len(sql)}")
    print(f"Products: {len(all_products)}")
    print(f"Categories: {len(lang_cats) + len(arabic_cats)} ({len(lang_cats)} top-level + {len(arabic_cats)} subcategories)")
    print(f"Purchase orders: {len(po_ids)}")
    print(f"Purchase items: {sum(len(inv['items']) for inv in invoice_data.values())}")


if __name__ == "__main__":
    main()
