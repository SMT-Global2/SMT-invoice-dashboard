import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PartyDetailsProps } from '../_types';

const PartyDetails: React.FC<PartyDetailsProps> = ({ party }) => (
  <div className="p-4">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[5%]">DC</TableHead>
            <TableHead className="w-[10%]">Date</TableHead>
            <TableHead className="w-[12%]">Voucher</TableHead>
            <TableHead className="w-[10%] text-right">Debits</TableHead>
            <TableHead className="w-[10%] text-right">Part Adj.</TableHead>
            <TableHead className="w-[10%] text-right">Balance</TableHead>
            <TableHead className="w-[10%] text-right">Balance C/F</TableHead>
            <TableHead className="w-[5%]">Days</TableHead>
            <TableHead className="w-[28%]">Discount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {party.entries.map((entry, index) => (
            <TableRow key={index} className={index % 2 === 0 ? "" : "bg-muted/30"}>
              <TableCell>{entry.dc}</TableCell>
              <TableCell>{entry.voucherDate}</TableCell>
              <TableCell>{entry.voucherNumber ? `${entry.dc} ${entry.voucherNumber}` : '*'}</TableCell>
              <TableCell className="font-mono text-right">
                {entry.debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-mono text-right">
                {entry.partAdjustment === 0 ? '-' : entry.partAdjustment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-mono text-right">
                {entry.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-mono text-right">
                {entry.balanceCarryForward.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell>{entry.days}</TableCell>
              <TableCell className="text-xs">{entry.discountNarration}</TableCell>
            </TableRow>
          ))}
          
          {party.total && (
            <TableRow className="bg-accent/50 font-semibold">
              <TableCell colSpan={3} className="font-medium">Total</TableCell>
              <TableCell className="font-medium font-mono text-right">
                {party.total.debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-medium font-mono text-right">
                {party.total.partAdjustment === 0 ? '-' : party.total.partAdjustment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="font-medium font-mono text-right">
                {party.total.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell className="font-medium">{party.total.discountNarration}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);

export default PartyDetails; 