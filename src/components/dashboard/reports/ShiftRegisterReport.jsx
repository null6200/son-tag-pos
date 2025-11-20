import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Eye, XCircle, ArrowLeft, User, Mail, Building, MapPin, DollarSign, TrendingUp, TrendingDown, FileText, CreditCard } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const ShiftRegisterReport = ({ user }) => {
  const [shifts, setShifts] = useState([]);
  const [viewingShift, setViewingShift] = useState(null);
  const [closingShift, setClosingShift] = useState(null);
  const [closingCash, setClosingCash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [totals, setTotals] = useState({ totalCash: 0, totalCard: 0, totalTransfer: 0, totalOther: 0, totalCredit: 0, grandTotal: 0 });

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      const res = await api.reports.shiftRegisters({ branchId: user?.branchId, status: 'ALL', limit: 100, offset: 0 });
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      setShifts(items);
      if (res?.totals) {
        setTotals({
          totalCash: Number(res.totals.totalCash || 0),
          totalCard: Number(res.totals.totalCard || 0),
          totalTransfer: Number(res.totals.totalTransfer || 0),
          totalOther: Number(res.totals.totalOther || 0),
          totalCredit: Number(res.totals.totalCredit || 0),
          grandTotal: Number(res.totals.grandTotal || 0),
        });
      } else {
        setTotals({ totalCash: 0, totalCard: 0, totalTransfer: 0, totalOther: 0, totalCredit: 0, grandTotal: 0 });
      }
    } catch (err) {
      toast({ title: 'Failed to load shifts', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [user?.branchId]);

  const handleCloseShift = async (e) => {
    e.preventDefault();
    const cashAmount = parseFloat(closingCash);

    if (isNaN(cashAmount) || cashAmount < 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid closing cash amount.", variant: "destructive" });
      return;
    }
    try {
      await api.shifts.close(closingShift.id, { closingCash: cashAmount });
      toast({ title: 'Register Closed!', description: 'Shift ended.' });
      setClosingShift(null);
      setClosingCash('');
      await loadShifts();
    } catch (err) {
      toast({ title: 'Failed to close shift', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleViewShift = async (shift) => {
    try {
      const report = await api.reports.shift({ shiftId: shift.id, branchId: shift.branchId, sectionId: shift.sectionId });
      setViewingShift(report);
    } catch (err) {
      toast({ title: 'Failed to load shift report', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  if (viewingShift) {
    return <ShiftDetailsView report={viewingShift} onBack={() => setViewingShift(null)} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Shift Register Logs</CardTitle>
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opened By</TableHead>
                <TableHead>Open Time</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Total Card Bills</TableHead>
                <TableHead className="text-right">Total Cash In</TableHead>
                <TableHead className="text-right">Total Bank Transfer</TableHead>
                <TableHead className="text-right">Other Payments</TableHead>
                <TableHead className="text-right">Total Debt / Credit</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && shifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    Loading shifts...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && shifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    No shifts found.
                  </TableCell>
                </TableRow>
              )}
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>{shift.openedByUsername || shift.openedById || 'Unknown'}</TableCell>
                  <TableCell>{new Date(shift.openedAt).toLocaleString()}</TableCell>
                  <TableCell>{shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={shift.closedAt ? 'secondary' : 'destructive'}>
                      {shift.closedAt ? 'Closed' : 'Open'}
                    </Badge>
                  </TableCell>
                  <TableCell>{shift.date ? new Date(shift.date).toLocaleDateString() : (shift.openedAt ? new Date(shift.openedAt).toLocaleDateString() : '')}</TableCell>
                  <TableCell>{[shift.branchName, shift.sectionName].filter(Boolean).join(' / ')}</TableCell>
                  <TableCell>{shift.userName || shift.userEmail || 'Unknown'}</TableCell>
                  <TableCell className="text-right">${(shift.totalCard ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(shift.totalCash ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(shift.totalTransfer ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(shift.totalOther ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${(shift.totalCredit ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">${(shift.grandTotal ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleViewShift(shift)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!shift.closedAt && (
                      <Button variant="ghost" size="icon" onClick={() => setClosingShift(shift)}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {shifts.length > 0 && (
            <div className="mt-4 border-t pt-4 text-sm font-semibold flex flex-wrap gap-4 justify-end">
              <span>Total Card Bills: ${totals.totalCard.toFixed(2)}</span>
              <span>Total Cash In: ${totals.totalCash.toFixed(2)}</span>
              <span>Total Bank Transfer: ${totals.totalTransfer.toFixed(2)}</span>
              <span>Other Payments: ${totals.totalOther.toFixed(2)}</span>
              <span>Total Debt/Credit: ${totals.totalCredit.toFixed(2)}</span>
              <span>Grand Total: ${totals.grandTotal.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>
      {closingShift && (
        <Dialog open={!!closingShift} onOpenChange={() => setClosingShift(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close Shift Register</DialogTitle>
              <DialogDescription>
                Closing shift for {closingShift.openedByUsername || closingShift.openedById || 'Unknown'} opened at {new Date(closingShift.openedAt).toLocaleString()}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCloseShift} className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Expected amount: <span className="font-bold text-foreground">${(closingShift.expectedCash ?? 0).toFixed(2)}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="closing-cash">Counted Cash Amount</Label>
                <Input id="closing-cash" type="number" step="0.01" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="e.g., 4100.50" />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setClosingShift(null)}>Cancel</Button>
                <Button type="submit">Confirm & Close Shift</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const ShiftDetailsView = ({ report, onBack }) => {
  if (!report) return null;

  const shift = report.shift || {};
  const summary = report.summary || {};
  const items = report.items || {};

  const totalSales = summary.totalSales ?? 0;
  const totalPayments = summary.totalSales ?? 0;
  const creditSales = summary.totalCreditSales ?? 0;

  const products = Array.isArray(items.byCategory) ? items.byCategory : [];
  const productsByBrand = Array.isArray(items.byBrand)
    ? items.byBrand.reduce((acc, row) => {
        acc[row.name || 'Unbranded'] = { quantity: row.count || 0, total: 0 };
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to List</Button>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Shift Details</CardTitle>
          <CardDescription>
            Shift from {shift.startedAt ? new Date(shift.startedAt).toLocaleString() : (shift.openedAt ? new Date(shift.openedAt).toLocaleString() : 'Unknown')}
            {' '}to {shift.endedAt ? new Date(shift.endedAt).toLocaleString() : (shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'Now')}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

          <section>
            <h3 className="text-lg font-semibold mb-2">User & Location Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <InfoItem icon={User} label="Username" value={shift.openedByUsername || shift.openedById || 'Unknown'} />
              <InfoItem icon={Mail} label="Email" value={shift.openedByEmail || 'Unknown'} />
              <InfoItem icon={Building} label="Branch" value={shift.branchName || 'Unknown'} />
              <InfoItem icon={MapPin} label="Section" value={shift.sectionName || 'Unknown'} />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">Total Sales Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard icon={TrendingUp} title="Total Sales" value={totalSales.toFixed(2)} color="text-green-500" />
              <SummaryCard icon={DollarSign} title="Total Payments" value={totalPayments.toFixed(2)} color="text-blue-500" />
              <SummaryCard icon={CreditCard} title="Credit Sales" value={creditSales.toFixed(2)} color="text-yellow-500" />
              <SummaryCard icon={TrendingDown} title="Total Refund" value={(report.summary?.totalRefund || 0).toFixed(2)} color="text-red-500" />
              <SummaryCard icon={FileText} title="Total Expenses" value={(report.summary?.expenses || 0).toFixed(2)} color="text-orange-500" />

            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <h3 className="text-lg font-semibold mb-2">Products Sold (by Category)</h3>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-center">{p.count}</TableCell>
                      <TableCell className="text-right">-</TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Sales by Brand</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(productsByBrand).map(([brand, data]) => (
                    <TableRow key={brand}>
                      <TableCell>{brand}</TableCell>
                      <TableCell className="text-center">{data.quantity}</TableCell>
                      <TableCell className="text-right">${data.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
    <Icon className="w-5 h-5 text-primary mt-1" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  </div>
);

const SummaryCard = ({ icon: Icon, title, value, color }) => (
  <Card className="p-4">
    <div className="flex items-center gap-4">
      <Icon className={`w-6 h-6 ${color}`} />
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={`text-xl font-bold ${color}`}>${value}</p>
      </div>
    </div>
  </Card>
);

export default ShiftRegisterReport;