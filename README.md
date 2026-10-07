# VNA Dak Song Booking Tour

![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue?style=for-the-badge&logo=mongodb)
![React](https://img.shields.io/badge/Frontend-React%20Zalo%20Mini%20App-0088FF?style=for-the-badge&logo=react)
![NodeJS](https://img.shields.io/badge/Backend-NodeJS%20%26%20Express-339933?style=for-the-badge&logo=nodedotjs)

> Zalo Mini App danh cho nen tang du lich Dak Song cua Tap doan VNA (VNA Group). Ung dung cung cap cac dich vu kham pha danh lam thang canh, trai nghiem am thuc va dac biet la he thong Dat Tour du lich toan dien ngay tren nen tang Zalo.

---

## Tong quan tinh nang (Features)

### Danh cho Khach hang (User App)
- Kham pha Dak Song: Doc cac bai viet van hoa, am thuc, ngam cac diem den check-in hot.
- Tim kiem Tour: Loc Tour theo gia, chu de (thien nhien, lich su, van hoa), thoi luong.
- Len lich trinh: Chon ngay khoi hanh, so luong nguoi va nhan bao gia tu dong.
- Booking & Chot don: Trai nghiem dat tour muot ma, luu tru lich su dat chuyen an toan voi Idempotency-Key.

### Danh cho Quan tri vien (Admin Portal)
- Quan ly Noi dung (CMS): Them, sua, xoa cac Diem den, Bai viet thong qua trinh soan thao.
- Quan tri Tour: Dong/mo cac chuyen khoi hanh, cap nhat gia linh hoat ma khong anh huong toi don cu.
- Xu ly Don hang: Xem danh sach khach dat, tien hanh Xac nhan (Duyet) hoac Tu choi don hang.
- Dashboard: Thong ke luong truy cap, luong don dat va doanh thu theo thoi gian thuc.

---

## Cong nghe su dung (Tech Stack)

### Frontend (Zalo Mini App)
- ReactJS 18 & TypeScript: Logic giao dien an toan, de bao tri.
- ZaUI (zmp-ui): Bo UI Components duoc thiet ke rieng, toi uu hoa cho man hinh Zalo.
- Vite: Cong cu build sieu toc.
- React Router (Memory Router): Dieu huong trang ma khong phu thuoc vao URL thanh trinh duyet.

### Backend (RESTful API)
- Node.js & Express (v5.x): Framework API manh me, toc do cao.
- MongoDB Atlas & Mongoose (v9): Co so du lieu linh hoat, tra cuu Text-Search than toc.
- JWT & Bcrypt: Phan quyen va bao mat tai khoan tuyet doi.
- Cloudinary & Multer: Quan ly CDN, tu dong xu ly va luu tru hinh anh toi uu tren may.

---

## Huong dan cai dat (Installation)

### 1. Chuan bi Moi truong
- Dam bao da cai dat [Node.js](https://nodejs.org/en/) (>= 20.19.0).
- Cai dat co so du lieu [MongoDB](https://www.mongodb.com/).
- Co tai khoan [Cloudinary](https://cloudinary.com/).

### 2. Cau hinh Backend
Di chuyen vao thu muc `backend`:
```bash
cd backend
npm install
```

Tao file `.env` bang cach copy tu file mau va dien cac thong tin cua ban:
```bash
cp .env.example .env
```
Mo file `.env` va dien: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, va cau hinh `CLOUDINARY_...`.

Tao tai khoan Admin mac dinh:
```bash
npm run create:admin
```

Chay Server:
```bash
npm run dev
```
*(Server se chay tai `http://localhost:8000`)*

### 3. Cau hinh Frontend
Di chuyen vao thu muc `frontend`:
```bash
cd frontend
npm install
```
Chay ung dung Frontend:
```bash
npm run dev
```

---

## Giay phep (License)
Ban quyen thuoc ve VNA Group. Nghiem cam sao chep duoi moi hinh thuc neu khong duoc phep.
