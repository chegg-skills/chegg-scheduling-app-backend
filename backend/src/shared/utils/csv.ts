/**
 * Converts an array of objects to a CSV string.
 * Handles escaping of commas, quotes, and newlines.
 */
export function convertToCSV(data: Record<string, any>[]): string {
    if (data.length === 0) {
        return ''
    }

    const headers = Object.keys(data[0])
    const csvRows = []

    // Add header row
    csvRows.push(headers.map(header => escapeCSVValue(header)).join(','))

    // Add data rows
    for (const row of data) {
        csvRows.push(
            headers
                .map(header => {
                    const value = row[header]
                    return escapeCSVValue(value)
                })
                .join(','),
        )
    }

    return csvRows.join('\r\n')
}

/**
 * Escapes a value for inclusion in a CSV field.
 * - Wraps in quotes if contains comma, quote, or newline.
 * - Double-quotes existing double-quotes.
 * - Formats Dates to ISO strings.
 */
function escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
        return ''
    }

    let stringValue = ''
    if (value instanceof Date) {
        stringValue = value.toISOString()
    } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value)
    } else {
        stringValue = String(value)
    }

    // Replace double-quotes with two double-quotes
    const escapedValue = stringValue.replace(/"/g, '""')

    // Wrap in quotes if it contains sensitive characters
    if (/[",\r\n]/.test(escapedValue)) {
        return `"${escapedValue}"`
    }

    return escapedValue
}
