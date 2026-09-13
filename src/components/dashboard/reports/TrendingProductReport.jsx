import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDown, Flame } from 'lucide-react';

const TrendingProductReport = ({ user }) => {
  const data = [
    { rank: 1, product: 'Mojito', qty: 95 },
    { rank: 2, product: 'Chicken Wings', qty: 80 },
    { rank: 3, product: 'Espresso', qty: 75 },
    { rank: 4, product: 'Beef Burger', qty: 60 },
    { rank: 5, product: 'Iced Latte', qty: 55 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="date-range">Date Range</Label>
            <Input id="date-range" type="date" />
          </div>
          <Button>Apply Filters</Button>
          <Button variant="outline" className="ml-auto"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Trending Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((item) => (
              <div key={item.rank} className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-lg mr-4">
                  {item.rank}
                </div>
                <div className="flex-grow">
                  <p className="font-semibold text-lg">{item.product}</p>
                </div>
                <div className="flex items-center text-orange-500">
                  <Flame className="w-5 h-5 mr-2" />
                  <span className="font-bold text-lg">{item.qty} sold</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendingProductReport;