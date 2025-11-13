import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Check, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const Production = ({ user }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const allOrders = JSON.parse(localStorage.getItem('loungeOrders') || '[]');
    const productionOrders = allOrders
      .filter(o => o.status === 'sent_to_kitchen/bar')
      .map(o => ({
        ...o,
        items: o.items.map(i => ({ ...i, status: 'pending' }))
      }));
    setOrders(productionOrders);
  }, []);

  const markItemReady = (orderId, itemId) => {
    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.map(item =>
            item.id === itemId ? { ...item, status: 'ready' } : item
          );
          return { ...order, items: updatedItems };
        }
        return order;
      })
    );
    toast({ title: "Item marked as ready!" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold gradient-text mb-2">Production (KDS)</h2>
        <p className="text-gray-600">Kitchen and Bar Display System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-10">No active orders for production.</p>
        )}
        {orders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass-effect border-2 border-white/30">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="gradient-text">{order.id} {order.table && `(${order.table})`}</span>
                  <span className="text-sm text-gray-500 font-normal">
                    {new Date(order.timestamp).toLocaleTimeString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map(item => (
                    <div key={item.id} className={`p-3 rounded-lg flex justify-between items-center transition-all ${item.status === 'ready' ? 'bg-green-100' : 'bg-white/50'}`}>
                      <div>
                        <p className="font-semibold text-lg">{item.quantity}x {item.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{item.prep_station} Station</p>
                      </div>
                      <Button
                        size="sm"
                        variant={item.status === 'ready' ? 'default' : 'outline'}
                        onClick={() => markItemReady(order.id, item.id)}
                        disabled={item.status === 'ready'}
                        className={item.status === 'ready' ? 'bg-green-500' : ''}
                      >
                        {item.status === 'ready' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Production;