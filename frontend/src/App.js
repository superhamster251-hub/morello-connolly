import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import Home from "@/pages/Home";
import CheckoutResult from "@/pages/CheckoutResult";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

function App() {
    return (
        <div className="App font-sans">
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/checkout/success" element={<CheckoutResult mode="success" />} />
                        <Route path="/checkout/cancel" element={<CheckoutResult mode="cancel" />} />
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                    </Routes>
                </BrowserRouter>
                <Toaster position="bottom-right" />
            </AuthProvider>
        </div>
    );
}

export default App;
