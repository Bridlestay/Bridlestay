# 📊 Host Earnings CSV Export

## Overview

Hosts can now export their earnings data to CSV for accounting, tax purposes, and record-keeping!

---

## ✅ Features:

### **CSV Export Button**
- Located on the Earnings Dashboard (`/host/earnings`)
- "Export to CSV" button in the top-right corner
- Downloads a comprehensive CSV file with all completed bookings

### **CSV Contents:**
The exported CSV includes:
- Booking ID
- Check-in Date
- Check-out Date
- Property Name
- Guest Name
- Guest Email
- Number of Guests
- Number of Horses
- Total Price (£)
- Platform Fee (£) - 2.5%
- Your Earnings (£) - After platform fee
- Status
- Booked On Date

### **Filename Format:**
- `earnings-YYYY-MM-DD.csv` (current date)

---

## 🔒 Security:

- ✅ Only hosts can export earnings
- ✅ Only exports bookings for the logged-in host
- ✅ Only includes completed bookings
- ✅ Server-side authorization checks

---

## 💼 Use Cases:

1. **Accounting** - Import into QuickBooks, Xero, etc.
2. **Tax Preparation** - Share with accountant
3. **Record Keeping** - Maintain personal records
4. **Analysis** - Import into Excel/Google Sheets for insights

---

## 📁 Files:

### **API Endpoint:**
- `app/api/host/earnings/export/route.ts`
- GET request
- Query params (optional):
  - `startDate` - Filter by start date (YYYY-MM-DD)
  - `endDate` - Filter by end date (YYYY-MM-DD)

### **UI Component:**
- `components/host/earnings-dashboard.tsx` - Added export button and handler

---

## 🎯 Future Enhancements:

- Date range picker for custom exports
- Filter by property
- Include payout status
- Export other formats (PDF, Excel)
- Email report to user
- Scheduled automatic exports

---

## 💡 Example CSV Output:

```csv
Booking ID,Check In,Check Out,Property,Guest Name,Guest Email,Guests,Horses,Total Price (£),Platform Fee (£),Your Earnings (£),Status,Booked On
abc123,2024-01-15,2024-01-20,"Barn Cottage","John Smith",john@example.com,2,2,450.00,11.25,438.75,completed,2024-01-01
def456,2024-02-10,2024-02-15,"Stable House","Jane Doe",jane@example.com,4,3,680.00,17.00,663.00,completed,2024-01-28
```

---

## 🚀 Testing:

1. Go to `/host/earnings` (must be logged in as a host)
2. Click "Export to CSV" button
3. Check downloads folder for CSV file
4. Open in Excel/Google Sheets to verify data

---

This feature helps hosts maintain professional financial records! 📈

