# คู่มือการแก้ไขปัญหา

## 1. ปัญหาการเชื่อมต่อกับ API

### 1.1 ข้อผิดพลาด: `net::ERR_CONNECTION_REFUSED`
```
GET http://localhost:3050/api/connections net::ERR_CONNECTION_REFUSED
```

### 1.2 สาเหตุที่เป็นไปได้:
- ไม่มี API Server ที่ทำงานอยู่ที่ port 3050
- API Server ถูกปิดหรือไม่สามารถเข้าถึงได้
- ระบบไม่สามารถเชื่อมต่อกับฐานข้อมูลได้
- ไฟล์ .env ไม่มีการตั้งค่าที่ถูกต้อง

## 2. วิธีแก้ไข

### 2.1 ตรวจสอบการตั้งค่าไฟล์ .env
ตรวจสอบว่าไฟล์ `.env` มีการตั้งค่า API endpoint อย่างถูกต้อง:

```env
# ตัวอย่างการตั้งค่า
NEXT_PUBLIC_API_URL=http://localhost:3050
```

### 2.2 ตรวจสอบการทำงานของ API Server
ตรวจสอบว่า API Server ทำงานอยู่หรือไม่:

1. ตรวจสอบว่ามีการรัน API Server อยู่หรือไม่:
   ```
   cd saas-api
   npm run dev
   ```

2. ตรวจสอบว่า port 3050 ถูกเปิดใช้งานหรือไม่:
   ```
   netstat -tuln | grep 3050
   ```

### 2.3 ตรวจสอบการเชื่อมต่อกับฐานข้อมูล
ตรวจสอบว่าระบบสามารถเชื่อมต่อกับฐานข้อมูลได้:

1. ตรวจสอบไฟล์ `.env` ว่ามีการตั้งค่าฐานข้อมูลอย่างถูกต้อง:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=your_database
   ```

2. ตรวจสอบว่าฐานข้อมูลสามารถเข้าถึงได้:
   ```
   mysql -h localhost -u your_username -p
   ```

### 2.4 ตรวจสอบ firewall หรือ proxy
ตรวจสอบว่า firewall หรือ proxy ไม่ได้บล็อก port 3050:

```
# ตรวจสอบว่า port 3050 สามารถเข้าถึงได้
telnet localhost 3050
```

## 3. การตั้งค่าระบบ

### 3.1 ตั้งค่า API Server
1. เข้าไปที่โฟลเดอร์ `saas-api`
2. รันคำสั่ง:
   ```
   npm install
   npm run dev
   ```

### 3.2 ตั้งค่า Admin UI
1. เข้าไปที่โฟลเดอร์ `admin-ui`
2. รันคำสั่ง:
   ```
   npm install
   npm run dev
   ```

## 4. ตรวจสอบระบบ

### 4.1 ตรวจสอบการเชื่อมต่อ
ตรวจสอบว่า API สามารถเข้าถึงได้:

```
curl http://localhost:3050/api/connections
```

### 4.2 ตรวจสอบ log ของระบบ
ตรวจสอบ log ของทั้ง API Server และ Admin UI เพื่อดูข้อผิดพลาดเพิ่มเติม:
- สำหรับ API Server: ตรวจสอบ log ที่แสดงเมื่อรัน `npm run dev` ในโฟลเดอร์ `saas-api`
- สำหรับ Admin UI: ตรวจสอบ log ที่แสดงเมื่อรัน `npm run dev` ในโฟลเดอร์ `admin-ui`