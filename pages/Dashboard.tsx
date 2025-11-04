import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell, TooltipProps } from 'recharts';
import { Header } from '../components/Header';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { useData } from '../context/DataContext';
import { formatCurrency, getMonthYear, isDateInPeriod, formatPercentage } from '../lib/utils';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import * as T from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-700 p-2 border border-gray-600 rounded">
        <p className="label text-white font-bold">{`${label}`}</p>
        {payload.map((pld, index) => (
            <p key={index} style={{ color: pld.color }}>
                {`${pld.name}: ${formatCurrency(pld.value as number)}`}
            </p>
        ))}
      </div>
    );
  }
  return null;
};


export default function Dashboard() {
  const { enrichedDailyAdCosts, commissions, currentPeriod, periodFinancials } = useData();

  const netProfit = periodFinancials?.netProfit ?? 0;
  const totalRevenue = periodFinancials?.totalRevenue ?? 0;
  const totalCost = periodFinancials?.totalCost ?? 0;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  
  const performanceData = useMemo(() => {
    if (!currentPeriod) return [];
    
    const monthlyData: { [key: string]: { month: string, profit: number, cost: number, revenue: number } } = {};
    
    const filteredCosts = enrichedDailyAdCosts.filter(c => isDateInPeriod(c.date, currentPeriod));
    const filteredCommissions = commissions.filter(c => isDateInPeriod(c.date, currentPeriod));
    const combinedData: (typeof filteredCosts[0] | typeof filteredCommissions[0])[] = [...filteredCosts, ...filteredCommissions];

    combinedData.forEach(item => {
        const month = getMonthYear(item.date);
        if (!monthlyData[month]) {
            monthlyData[month] = { month, profit: 0, cost: 0, revenue: 0 };
        }
        
        if ('vndCost' in item) { // It's a DailyAdCost
            monthlyData[month].cost += item.vndCost;
        } else if ('vndAmount' in item) { // It's a Commission
            monthlyData[month].revenue += item.vndAmount;
        }
    });

    return Object.values(monthlyData).map(data => ({
        ...data,
        profit: data.revenue - data.cost
    })).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [enrichedDailyAdCosts, commissions, currentPeriod]);

  const profitDistributionData = [
    { name: 'Tổng Chi phí', value: totalCost },
    { name: 'Lợi nhuận ròng', value: Math.max(0, netProfit) },
  ];
  const COLORS = ['#be123c', '#059669'];


  return (
    <div>
      <Header title="Tổng quan" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>Lợi nhuận ròng kỳ này</CardHeader>
          <CardContent className="text-3xl font-bold text-green-400">{formatCurrency(netProfit)}</CardContent>
        </Card>
        <Card>
          <CardHeader>Doanh thu kỳ này</CardHeader>
          <CardContent className="text-3xl font-bold text-primary-400">{formatCurrency(totalRevenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader>Tổng chi phí kỳ này</CardHeader>
          <CardContent className="text-3xl font-bold text-red-400">{formatCurrency(totalCost)}</CardContent>
        </Card>
        <Card>
          <CardHeader>ROI kỳ này</CardHeader>
          <CardContent className={`text-3xl font-bold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercentage(roi)}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>Hiệu suất trong kỳ</CardHeader>
          <CardContent style={{height: '300px'}}>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(value) => formatCurrency(value as number, 'VND').replace(' ₫', 'K').replace(/,000$/, '')} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155' }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Doanh thu"/>
                  <Bar dataKey="cost" fill="#ef4444" name="Chi phí"/>
                  <Bar dataKey="profit" fill="#22c55e" name="Lợi nhuận" />
                </BarChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Phân chia lợi nhuận kỳ này</CardHeader>
          <CardContent style={{height: '300px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={profitDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {profitDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>Phân chia lợi nhuận theo đối tác</CardHeader>
        <CardContent>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeader className="text-left pl-6">Đối tác</TableHeader>
                        <TableHeader>Doanh thu</TableHeader>
                        <TableHeader>Chi phí</TableHeader>
                        <TableHeader>Lợi nhuận</TableHeader>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {periodFinancials?.partnerPnlDetails.map(p => (
                        <TableRow key={p.partnerId}>
                            <TableCell className="font-medium text-white text-left pl-6">{p.name}</TableCell>
                            <TableCell className="text-primary-400">{formatCurrency(p.revenue)}</TableCell>
                            <TableCell className="text-red-400">{formatCurrency(p.cost)}</TableCell>
                            <TableCell className={`font-semibold ${p.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(p.profit)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <tfoot className="border-t-2 border-gray-700">
                    <TableRow className="hover:bg-gray-900">
                        <TableCell className="font-bold text-white text-left pl-6">Tổng cộng</TableCell>
                        <TableCell className="font-bold text-primary-400">{formatCurrency(periodFinancials?.totalRevenue)}</TableCell>
                        <TableCell className="font-bold text-red-400">{formatCurrency(periodFinancials?.totalCost)}</TableCell>
                        <TableCell className={`font-bold ${periodFinancials && periodFinancials.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(periodFinancials?.totalProfit)}
                        </TableCell>
                    </TableRow>
                </tfoot>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}