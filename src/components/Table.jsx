

const Table = ({ headers, rows }) => {
  return (
    <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={row.id}>
                {row.data.map((item, index) => (
                  <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {item}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                  {row.actions}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="px-6 py-4 text-center text-gray-600">
                No data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;