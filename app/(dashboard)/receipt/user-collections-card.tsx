"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/helper";
import moment from "moment";
import { useReceiptStore } from "@/store/useReceiptStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  DENOMINATIONS,
  DenominationBills,
  EditDenominationDialog,
  totalOf,
} from "./today-denomination-card";

interface UserCollection {
  username: string;
  totalAmount: number;
  receiptCount: number;
  bills: DenominationBills;
}

const emptyBills: DenominationBills = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 };

export function UserCollectionsCard() {
  const { toast } = useToast();
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const { selectedDate, receiptItems } = useReceiptStore();

  const fetchCollections = async () => {
    if (!selectedDate) return;
    setIsLoading(true);
    try {
      const formattedDate = moment(selectedDate).format("YYYY-MM-DD");
      const res = await fetch(`/api/receipt/summary?date=${formattedDate}`);
      if (!res.ok) throw new Error("Failed to fetch collections");
      const data = await res.json();
      setCollections(data.data || []);
    } catch (error) {
      console.error("Error fetching collections summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [selectedDate, receiptItems]);

  const getDiffColor = (d: number) => {
    if (d > 0) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (d < 0) return "text-destructive bg-destructive/10 border-destructive/20";
    return "text-muted-foreground bg-muted border-border";
  };

  if (!collections || collections.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader 
        className="py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Collections by User</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      {isOpen && (
        <CardContent className="py-3 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {collections.map((c) => {
              const uDenomTotal = totalOf(c.bills || emptyBills);
              const uDiff = uDenomTotal - c.totalAmount;

              return (
                <div key={c.username} className="flex flex-col border rounded-lg bg-card shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center p-3 border-b bg-muted/30">
                    <span className="font-bold capitalize">{c.username}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingUser(c.username);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="p-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Receipts Total:</span>
                      <span className="font-semibold">{formatCurrency(c.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-muted-foreground">Denominations Total:</span>
                      <span className="font-semibold">{formatCurrency(uDenomTotal)}</span>
                    </div>

                    <div className={`flex justify-between items-center text-sm p-1.5 rounded border ${getDiffColor(uDiff)}`}>
                      <span className="font-semibold">Difference:</span>
                      <span className="font-bold">
                        {uDiff > 0 ? "+" : ""}
                        {formatCurrency(uDiff)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/10 p-3 border-t">
                    <div className="flex flex-wrap gap-1.5">
                      {DENOMINATIONS.filter((d) => c.bills?.[d] > 0).map((d) => (
                        <div
                          key={d}
                          className="text-xs bg-background border px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-1 shadow-sm"
                        >
                          <span className="font-semibold text-foreground">₹{d}</span>
                          <span className="opacity-50 text-[10px]">x</span>
                          <span className="font-bold text-foreground">{c.bills[d]}</span>
                        </div>
                      ))}
                      {DENOMINATIONS.every((d) => !c.bills?.[d]) && (
                        <span className="text-xs text-muted-foreground italic">No denominations entered</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}

      <EditDenominationDialog
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        date={moment(selectedDate ?? new Date()).format("YYYY-MM-DD")}
        username={editingUser || ""}
        initial={collections.find((c) => c.username === editingUser)?.bills || emptyBills}
        onSaved={(saved) => {
          fetchCollections();
          setEditingUser(null);
          toast({ title: "Saved", description: "Denomination updated." });
        }}
      />
    </Card>
  );
}

