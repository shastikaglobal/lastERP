import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback } from "react";

export function LowStockSwiper() {
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: 1500, stopOnInteraction: true })]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const { data: lowStockItems, isLoading } = useQuery({
    queryKey: ['low_stock_alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_product_stock_levels' as any)
        .select('*')
        .or('stock_status.eq.low,stock_status.eq.warning')
        .order('current_stock_kg', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading || !lowStockItems || lowStockItems.length === 0) return null;

  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-md">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold">Stock Alerts</h2>
          <span className="bg-amber-500/20 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            {lowStockItems.length} items low
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={scrollPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={scrollNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {lowStockItems.map((item: any) => (
            <div key={item.product_id} className="flex-[0_0_100%] md:flex-[0_0_45%] lg:flex-[0_0_31%] min-w-0">
              <Card className={`border-l-4 ${item.stock_status === 'low' ? 'border-l-red-500' : 'border-l-amber-500'} bg-card/50 backdrop-blur-sm`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-sm truncate max-w-[150px]">{item.product_name}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${item.stock_status === 'low' ? 'text-red-500' : 'text-amber-500'}`}>
                        {Math.round(item.current_stock_kg).toLocaleString()} kg
                      </p>
                      <p className="text-[10px] text-muted-foreground italic">limit: {item.min_stock_level}kg</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-muted rounded-full h-1.5 mb-4">
                    <div 
                      className={`h-1.5 rounded-full ${item.stock_status === 'low' ? 'bg-red-500' : 'bg-amber-500'}`} 
                      style={{ width: `${Math.min(100, (item.current_stock_kg / item.min_stock_level) * 100)}%` }} 
                    />
                  </div>

                  <Button 
                    className="w-full btn-gold h-8 text-xs gap-2"
                    onClick={() => navigate('/procurement/orders/create')}
                  >
                    <ShoppingCart className="h-3 w-3" />
                    Restock Now
                    <ArrowRight className="h-3 w-3 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
