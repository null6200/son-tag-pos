
import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, Bell, User, Settings, LifeBuoy, Menu, Calendar, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = ({ user, onLogout, onMenuClick, setActiveTab, onGoToPOS }) => {
  const handleFeatureRequest = () => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" });
  
  const today = new Date().toLocaleDateString('en-GB');

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="w-6 h-6" />
          </Button>
          <div className="hidden sm:flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={handleFeatureRequest} className="bg-green-500 hover:bg-green-600 text-white border-green-500">
                <Briefcase className="w-4 h-4 mr-2"/> +
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('calendar')} className="bg-green-500 hover:bg-green-600 text-white border-green-500">
                <Calendar className="w-4 h-4 mr-2"/>
            </Button>
            <Button variant="default" size="sm" onClick={() => (onGoToPOS ? onGoToPOS() : setActiveTab('pos'))} className="bg-green-500 hover:bg-green-600 text-white">
                POS
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:block">{today}</div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleFeatureRequest}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all relative"
          >
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-800" />
          </motion.button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 p-1 pr-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                </div>
                <span className="font-semibold text-sm hidden sm:inline">{user?.username || 'User'}</span>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mr-4">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <div className="flex flex-col">
                  <span className="font-semibold">{user?.username || 'User'}</span>
                  {(() => {
                    const humanRole = user?.appRole?.name || user?.role || '';
                    const branchName = user?.branch?.name || user?.branch || '';
                    return <span className="text-xs text-muted-foreground">{humanRole}{(humanRole && branchName) ? ' at ' : ''}{branchName}</span>;
                  })()}
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleFeatureRequest}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleFeatureRequest}>
                <LifeBuoy className="mr-2 h-4 w-4" />
                <span>Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;

