import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  hideOnCard?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
}

export default function DataTable<T extends Record<string, any>>({ columns, rows, keyField, onRowClick, emptyState }: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <div className={styles.tableWrap}>{emptyState}</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(col => <th key={col.key}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={String(row[keyField])}
                className={onRowClick ? styles.rowClickable : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cardList}>
        {rows.map(row => (
          <div
            key={String(row[keyField])}
            className={styles.card}
            onClick={() => onRowClick?.(row)}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {columns.filter(c => !c.hideOnCard).map(col => (
              <div key={col.key} className={styles.cardRow}>
                <span className={styles.cardRowLabel}>{col.label}</span>
                <span className={styles.cardRowValue}>{col.render ? col.render(row) : row[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
