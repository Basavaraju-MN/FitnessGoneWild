import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Home from './pages/Home';
import Login from './pages/login';
import Placeholder from './pages/Placeholder';

import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Client website */}
        <Route path="/" element={<Home />} />

        <Route
          path="/treks"
          element={<Placeholder title="Treks" />}
        />

        <Route
          path="/about"
          element={<Placeholder title="About Us" />}
        />

        <Route
          path="/reviews"
          element={<Placeholder title="Reviews" />}
        />

        <Route
          path="/faq"
          element={<Placeholder title="FAQ" />}
        />

        <Route
          path="/contact"
          element={<Placeholder title="Contact" />}
        />

        {/* Authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

      </Routes>
    </BrowserRouter>
  );
}