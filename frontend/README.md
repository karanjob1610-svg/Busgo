# Frontend README

## Bus Ticket Booking System - Frontend

### Setup Instructions

1. **Install Dependencies**
```bash
npm install
```

2. **Create Environment Variables**
Create a `.env` file in the frontend root:
```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ENV=development
```

3. **Start Development Server**
```bash
npm start
```

The application will open at `http://localhost:3000`

### Build for Production
```bash
npm run build
```

### Project Structure

```
src/
├── components/          # Reusable React components
├── pages/              # Page components
├── context/            # Zustand stores
├── services/           # API service
└── styles/             # CSS files
```

### Available Pages

- **Home** (`/`) - Search buses
- **Login** (`/login`) - User login
- **Register** (`/register`) - User registration
- **Search Results** (`/search`) - Display search results
- **Seat Selection** (`/buses/:scheduleId/seats`) - Select seats
- **Payment** (`/payment/:scheduleId`) - Payment and booking
- **Confirmation** (`/confirmation/:bookingNumber`) - Booking confirmation

### Technologies Used

- React 18
- Tailwind CSS
- React Router
- Axios
- Zustand (State Management)
- React Icons

### Features Implemented

- ✅ User authentication
- ✅ Bus search with filters
- ✅ Dynamic seat selection
- ✅ Passenger details form
- ✅ Payment processing
- ✅ Booking confirmation with QR code
- ✅ Responsive design
- ✅ Toast notifications
- ✅ Protected routes

