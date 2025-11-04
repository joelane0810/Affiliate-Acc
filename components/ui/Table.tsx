import React from 'react';

export const Table: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`overflow-x-auto rounded-lg border border-gray-700 ${className}`}>
    <table className="min-w-full divide-y divide-gray-700">{children}</table>
  </div>
);

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-gray-800">{children}</thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="bg-gray-900 divide-y divide-gray-800">{children}</tbody>
);

export const TableRow: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <tr className={`hover:bg-gray-800 transition-colors duration-150 ${className}`}>{children}</tr>
);

// Fix: Allow all th attributes (like onClick) and make children optional.
interface TableHeaderProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
    children?: React.ReactNode;
}
export const TableHeader: React.FC<TableHeaderProps> = ({ children, className, ...props }) => (
  <th scope="col" className={`px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider sm:px-6 ${className}`} {...props}>
    {children}
  </th>
);

// Fix: Allow all td attributes (like colSpan) and make children optional.
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    children?: React.ReactNode;
}
export const TableCell: React.FC<TableCellProps> = ({ children, className, ...props }) => (
  <td className={`px-2 py-4 whitespace-nowrap text-sm text-gray-300 text-center sm:px-6 ${className}`} {...props}>{children}</td>
);