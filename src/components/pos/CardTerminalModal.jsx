import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { DollarSign, RefreshCw, Printer } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const CardTerminalModal = ({ isOpen, onClose, onSubmit }) => {
    const [type, setType] = useState('refund');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (isOpen) {
            setType('refund');
            setAmount('');
            setReason('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (type === 'refund') {
            const numericAmount = parseFloat(amount);
            if (isNaN(numericAmount) || numericAmount <= 0) {
                toast({ title: "Invalid Amount", description: "Please enter a valid positive amount for the refund.", variant: "destructive" });
                return;
            }
            if (!reason.trim()) {
                toast({ title: "Reason Required", description: "Please provide a reason for the refund.", variant: "destructive" });
                return;
            }
            onSubmit({ type, amount: numericAmount, reason });
        } else {
            // For other types like 'reprint'
            onSubmit({ type });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Card Terminal Action</DialogTitle>
                    <DialogDescription>Perform an action on the card payment terminal.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Action Type</Label>
                        <ToggleGroup type="single" value={type} onValueChange={(value) => { if (value) setType(value); }} className="grid grid-cols-2">
                            <ToggleGroupItem value="refund" aria-label="Process Refund">
                                <RefreshCw className="h-4 w-4 mr-2 text-orange-500" />
                                Refund
                            </ToggleGroupItem>
                            <ToggleGroupItem value="reprint" aria-label="Reprint Last Receipt">
                                <Printer className="h-4 w-4 mr-2 text-blue-500" />
                                Reprint
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    {type === 'refund' && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="card-amount">Refund Amount</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="card-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="pl-8" step="0.01" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="card-reason">Reason for Refund</Label>
                                <Input id="card-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Customer dissatisfaction" />
                            </div>
                        </>
                    )}
                     {type === 'reprint' && (
                        <div className="text-center p-4 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground">This will reprint the last transaction receipt from the terminal.</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Process Action</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CardTerminalModal;