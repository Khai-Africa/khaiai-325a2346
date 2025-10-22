import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface CurrencyRate {
  currency_code: string;
  rate_to_usd: number;
}

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "XAF", symbol: "FCFA", name: "Central African Franc" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "RWF", symbol: "FRw", name: "Rwandan Franc" },
  { code: "XOF", symbol: "CFA", name: "West African Franc" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export const useCurrency = () => {
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState("XAF");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRates();
    if (user) {
      fetchUserPreference();
    }
  }, [user]);

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from("currency_rates")
        .select("*");

      if (error) throw error;

      const ratesMap: Record<string, number> = {};
      data?.forEach((rate: CurrencyRate) => {
        ratesMap[rate.currency_code] = rate.rate_to_usd;
      });
      setRates(ratesMap);
    } catch (error) {
      console.error("Error fetching currency rates:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreference = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_currency_preferences")
        .select("preferred_currency")
        .eq("user_id", user.id)
        .single();

      if (data && !error) {
        setSelectedCurrency(data.preferred_currency);
      }
    } catch (error) {
      console.error("Error fetching user currency preference:", error);
    }
  };

  const updateCurrency = async (currencyCode: string) => {
    setSelectedCurrency(currencyCode);

    if (user) {
      try {
        const { error } = await supabase
          .from("user_currency_preferences")
          .upsert({
            user_id: user.id,
            preferred_currency: currencyCode,
          });

        if (error) throw error;
      } catch (error) {
        console.error("Error updating currency preference:", error);
      }
    }
  };

  const convertPrice = (usdPrice: number, toCurrency: string = selectedCurrency): number => {
    if (toCurrency === "USD") return usdPrice;
    const rate = rates[toCurrency] || 1;
    return Math.round(usdPrice * rate);
  };

  const formatPrice = (usdPrice: number, currencyCode: string = selectedCurrency): string => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    const convertedPrice = convertPrice(usdPrice, currencyCode);
    return `${currency?.symbol || "$"}${convertedPrice.toLocaleString()}`;
  };

  return {
    selectedCurrency,
    currencies: CURRENCIES,
    rates,
    loading,
    updateCurrency,
    convertPrice,
    formatPrice,
  };
};
