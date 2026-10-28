import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import SiteLayout from "./components/SiteLayout";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import { Shop, Categories, TodaysSpecial } from "./pages/Shop";
import { CartPage, CheckoutPage } from "./pages/CartCheckout";
import OrderConfirmation from "./pages/OrderConfirmation";
import TrackOrder from "./pages/TrackOrder";
import CustomCake from "./pages/CustomCake";
import Account from "./pages/Account";
import Admin from "./pages/Admin";

function StoreRouter() {
  return (
    <SiteLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/categories" component={Categories} />
        <Route path="/today-special" component={TodaysSpecial} />
        <Route path="/product/:slug" component={ProductDetail} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route
          path="/order-confirmation/:orderCode"
          component={OrderConfirmation}
        />
        <Route path="/track-order" component={TrackOrder} />
        <Route path="/custom-cake" component={CustomCake} />
        <Route path="/account" component={Account} />
        <Route component={NotFound} />
      </Switch>
    </SiteLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin" component={Admin} />
      <Route component={StoreRouter} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <CartProvider>
            <Toaster />
            <Router />
          </CartProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
