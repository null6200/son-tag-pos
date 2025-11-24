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
  const [currencySymbol, setCurrencySymbol] = useState('₦');

  useEffect(() => {
    const loadBiz = () => {
      try {
        const raw = localStorage.getItem('businessInfo');
        if (!raw) return;
        const info = JSON.parse(raw);
        let sym = (info && (info.currencySymbol || info.currency)) || '₦';
        if (typeof sym === 'string') {
          sym = sym.trim();
          if (/ngn/i.test(sym) || /naira/i.test(sym)) {
            sym = '₦';
          }
          setCurrencySymbol(sym || '₦');
        }
      } catch {}
    };
    loadBiz();
    try {
      const handler = () => loadBiz();
      window.addEventListener('businessInfoUpdated', handler);
      return () => { try { window.removeEventListener('businessInfoUpdated', handler); } catch {} };
    } catch {
      return undefined;
    }
  }, []);

  const fmt = (v) => `${currencySymbol}${Number(v || 0).toFixed(2)}`;

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

  const handleExportExcel = () => {
    try {
      const payload = {
        items: shifts,
        totals,
        exportedAt: new Date().toISOString(),
        branchId: user?.branchId || null,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shift_register_report.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'Export failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleExportPdf = () => {
    try {
      window.print();
    } catch (err) {
      toast({ title: 'Export failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

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
    return <ShiftDetailsView report={viewingShift} onBack={() => setViewingShift(null)} fmt={fmt} currencySymbol={currencySymbol} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Shift Register Logs</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileDown className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <Button variant="outline" onClick={handleExportPdf}>
              <FileDown className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>
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
                  <TableCell className="text-right">{fmt(shift.totalCard ?? 0)}</TableCell>
                  <TableCell className="text-right">{fmt(shift.totalCash ?? 0)}</TableCell>
                  <TableCell className="text-right">{fmt(shift.totalTransfer ?? 0)}</TableCell>
                  <TableCell className="text-right">{fmt(shift.totalOther ?? 0)}</TableCell>
                  <TableCell className="text-right">{fmt(shift.totalCredit ?? 0)}</TableCell>
                  <TableCell className="text-right font-bold">{fmt(shift.grandTotal ?? 0)}</TableCell>
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
              <span>Total Card Bills: {fmt(totals.totalCard)}</span>
              <span>Total Cash In: {fmt(totals.totalCash)}</span>
              <span>Total Bank Transfer: {fmt(totals.totalTransfer)}</span>
              <span>Other Payments: {fmt(totals.totalOther)}</span>
              <span>Total Debt/Credit: {fmt(totals.totalCredit)}</span>
              <span>Grand Total: {fmt(totals.grandTotal)}</span>
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
                Expected amount: <span className="font-bold text-foreground">{fmt(closingShift.expectedCash ?? 0)}</span>
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

const ShiftDetailsView = ({ report, onBack, fmt, currencySymbol }) => {
  if (!report) return null;

  const shift = report.shift || {};
  const summary = report.summary || {};
  const items = report.items || {};
  const totalSales = Number(summary.totalSales ?? 0);
  const totalDiscounts = Number(summary.totalDiscounts ?? 0);
  const totalExpenses = Number(summary.totalExpenses ?? 0);
  const creditSales = Number(summary.totalCreditSales ?? 0);
  const netSales = Math.max(0, totalSales - totalDiscounts);

  const products = Array.isArray(items.products) ? items.products : [];
  const categories = Array.isArray(items.byCategory) ? items.byCategory : [];
  const productsByBrand = Array.isArray(items.byBrand) ? items.byBrand : [];

  const totalQtyProducts = products.reduce((acc, p) => acc + Number(p.count || 0), 0);
  const totalQtyByCategory = categories.reduce((acc, c) => acc + Number(c.count || 0), 0);
  const totalQtyByBrand = productsByBrand.reduce((acc, b) => acc + Number(b.count || 0), 0);

  const firstCashier = Array.isArray(report.staff?.cashiers) && report.staff.cashiers.length > 0
    ? report.staff.cashiers[0]
    : null;
  const displayUserName = shift.openedByName || firstCashier?.name || 'Unknown';
  const displayUserEmail = shift.openedByEmail || firstCashier?.email || '';
  const displayLocation = [shift.branchName, shift.sectionName].filter(Boolean).join(' - ') || shift.branchLocation || '';

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to List</Button>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Register Details</CardTitle>
          <CardDescription>
            {`Register Details (${shift.startedAt ? new Date(shift.startedAt).toLocaleString() : (shift.openedAt ? new Date(shift.openedAt).toLocaleString() : 'Unknown')} - ${shift.endedAt ? new Date(shift.endedAt).toLocaleString() : (shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'Now')})`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* Payment summary table */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Payment Summary</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const byMethod = summary.byMethod || {};
                  const rows = [];

                  const cash = Number(byMethod.cash || byMethod['cash payment'] || 0);
                  const card = Number(byMethod.card || byMethod['card payment'] || 0);
                  const transfer = Number(byMethod.transfer || byMethod['bank transfer'] || 0);
                  const otherKeys = Object.keys(byMethod).filter(k => !['cash','cash payment','card','card payment','transfer','bank transfer'].includes(k));
                  const other = otherKeys.reduce((acc, k) => acc + Number(byMethod[k] || 0), 0);
                  rows.push({ label: 'Cash Payment', amount: cash });
                  rows.push({ label: 'Card Payment', amount: card });
                  rows.push({ label: 'Bank Transfer', amount: transfer });
                  if (other !== 0) rows.push({ label: 'Other Payments', amount: other });
                  return (
                    <>
                      {rows.map(r => (
                        <TableRow key={r.label}>
                          <TableCell>{r.label}</TableCell>
                          <TableCell className="text-right">{fmt(r.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  );
                })()}
              </TableBody>
            </Table>
          </section>

          {/* Totals block similar to reference layout */}
          <section className="border rounded-md overflow-hidden text-sm">
            <div className="grid grid-cols-2">
              <div className="px-3 py-2 font-semibold border-b">Net Sales</div>
              <div className="px-3 py-2 border-b text-right bg-green-50 font-semibold">{fmt(netSales)}</div>

              <div className="px-3 py-2 font-semibold border-b">Total Discount</div>
              <div className="px-3 py-2 border-b text-right bg-red-50">{fmt(totalDiscounts)}</div>

              <div className="px-3 py-2 font-semibold border-b">Total Payment</div>
              <div className="px-3 py-2 border-b text-right bg-green-50 font-semibold">{fmt(totalSales)}</div>

              <div className="px-3 py-2 font-semibold border-b">Credit Sales</div>
              <div className="px-3 py-2 border-b text-right bg-yellow-50">{fmt(creditSales)}</div>

              <div className="px-3 py-2 font-semibold">Total Expenses</div>
              <div className="px-3 py-2 text-right bg-red-50">{fmt(totalExpenses)}</div>
            </div>
          </section>

          {/* Details of products sold (per product) */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Details of products sold</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Total amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p, idx) => (
                  <TableRow key={p.name || idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-center">{p.count}</TableCell>
                    <TableCell className="text-right">{fmt(p.totalAmount ?? 0)}</TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">No products sold.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-2 text-sm font-semibold flex justify-between">
              <span>Total quantity: {totalQtyProducts}</span>
              <span>Grand Total: {fmt(totalSales)}</span>
            </div>
          </section>

          {/* Details of products sold (By Category) */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Details of products sold (By Category)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Total amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c, idx) => (
                  <TableRow key={c.name || idx}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-center">{c.count}</TableCell>
                    <TableCell className="text-right">{fmt(c.totalAmount ?? 0)}</TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No category data available.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-2 text-sm font-semibold flex justify-between">
              <span>Total quantity: {totalQtyByCategory}</span>
              <span>Grand Total: {fmt(totalSales)}</span>
            </div>
          </section>

          {/* Details of products sold (By Brand) */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Details of products sold (By Brand)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Total amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsByBrand.map((b, idx) => (
                  <TableRow key={b.name || idx}>
                    <TableCell>{b.name || 'Unbranded'}</TableCell>
                    <TableCell className="text-center">{b.count}</TableCell>
                    <TableCell className="text-right">{fmt(b.totalAmount ?? 0)}</TableCell>
                  </TableRow>
                ))}
                {productsByBrand.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No brand data available.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-2 text-sm font-semibold flex justify-between">
              <span>Total quantity: {totalQtyByBrand}</span>
              <span>Grand Total: {fmt(totalSales)}</span>
            </div>
          </section>

          {/* User / Email / Location footer, matching reference layout */}
          <section className="pt-4 border-t mt-4 text-sm">
            <div className="flex flex-col gap-1">
              <div> User: <span className="font-semibold">{displayUserName}</span></div>
              <div> Email: <span className="font-semibold">{displayUserEmail}</span></div>
              <div>
                <span className="font-semibold">{displayLocation}</span>
              </div>
            </div>
          </section>

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

export default ShiftRegisterReport;