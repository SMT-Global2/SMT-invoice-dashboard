"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Medal } from "lucide-react";
import { fetchPartiesData } from "./api";

interface TopPartiesProps {
  title?: string;
  description?: string;
}

interface PartyData {
  id: string;
  name: string;
  count: number;
  ranking: number;
  percentage: number;
}

export function TopParties({
  title = "Top Parties",
  description = "Most active agencies and third parties"
}: TopPartiesProps) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  
  const [agencyData, setAgencyData] = useState<PartyData[]>([]);
  const [clientData, setClientData] = useState<PartyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("agencies");

  // Medal colors
  const medalColors = {
    1: "text-yellow-500",
    2: "text-gray-400", 
    3: "text-amber-600"
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const partiesData = await fetchPartiesData(date);
        
        setAgencyData(partiesData.topAgencies || []);
        setClientData(partiesData.topClients || []);
      } catch (error) {
        console.error('Error fetching top parties data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [date]);

  // Render medal or rank number
  const renderRanking = (ranking: number) => {
    if (ranking <= 3) {
      return <Medal className={`h-4 w-4 ${medalColors[ranking as keyof typeof medalColors]}`} />;
    }
    return ranking;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <DatePickerWithRange date={date} setDate={setDate} />
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="agencies">Agencies</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>
          
          <TabsContent value="agencies">
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : agencyData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No agency data available for the selected period
              </div>
            ) : (
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Agency Name</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencyData.map((agency) => (
                      <TableRow key={agency.id}>
                        <TableCell className="font-medium">
                          {renderRanking(agency.ranking)}
                        </TableCell>
                        <TableCell>{agency.name}</TableCell>
                        <TableCell className="text-right">{agency.count}</TableCell>
                        <TableCell className="text-right">{agency.percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="clients">
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : clientData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No client data available for the selected period
              </div>
            ) : (
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientData.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          {renderRanking(client.ranking)}
                        </TableCell>
                        <TableCell>{client.name}</TableCell>
                        <TableCell className="text-right">{client.count}</TableCell>
                        <TableCell className="text-right">{client.percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 