# Admin Dashboard

The admin dashboard provides comprehensive analytics and usage statistics for the Jirung Senior Advisor application.

## Features

### Authentication
- Password-based authentication using `ADMIN_PASSWORD` environment variable
- Secure Bearer token authentication for API access
- Session-based access (no persistent login)

### Analytics Dashboard
- **Key Metrics**: Total questions, unique sessions, LINE click rate, average response time
- **Topic Analysis**: Top topics with counts and percentages
- **Language Distribution**: Thai vs English usage statistics
- **Session Analytics**: Average questions per session, conversion rate, abandonment rate
- **Temporal Analysis**: Hourly distribution and daily trends
- **Conversation Patterns**: Common conversation flows and handoff patterns
- **Top Questions**: Most frequently asked questions with topics

### Data Export
- CSV export functionality for investor reporting
- Comprehensive data including summary statistics
- Proper CSV formatting with quote escaping
- Timestamped filenames for easy organization

## Usage

### Accessing the Dashboard

1. Navigate to `/admin` in your browser
2. Enter the admin password (set via `ADMIN_PASSWORD` environment variable)
3. View analytics data for different time periods (1d, 7d, 30d, 90d)

### API Access

The admin API can be accessed programmatically:

```bash
# Get analytics data
curl -H "Authorization: Bearer YOUR_ADMIN_PASSWORD" \
     "https://your-domain.com/api/admin/stats?period=7d"

# Export CSV data
curl -H "Authorization: Bearer YOUR_ADMIN_PASSWORD" \
     "https://your-domain.com/api/admin/stats?period=7d&format=csv" \
     -o analytics-export.csv
```

### Environment Configuration

```bash
# Required: Set admin password
ADMIN_PASSWORD=your_secure_admin_password_here

# Optional: Database configuration (for analytics storage)
KV_URL=your_vercel_kv_url_here
# OR
DATABASE_URL=your_postgres_url_here
```

## API Endpoints

### GET /api/admin/stats

Returns comprehensive analytics data.

**Query Parameters:**
- `period`: Time period (`1d`, `7d`, `30d`, `90d`) - default: `7d`
- `format`: Response format (`json`, `csv`) - default: `json`

**Authentication:**
- Header: `Authorization: Bearer <ADMIN_PASSWORD>`

**Response (JSON):**
```json
{
  "period": "7d",
  "stats": {
    "totalQuestions": 150,
    "uniqueSessions": 75,
    "topTopics": [...],
    "languageDistribution": {...},
    "lineClickRate": 12.5,
    "averageResponseTime": 2.3
  },
  "topQuestions": [...],
  "conversationFlows": [...],
  "commonPatterns": [...],
  "hourlyDistribution": {...},
  "dailyTrends": [...],
  "sessionAnalytics": {...}
}
```

**Response (CSV):**
- Headers: Date, Session ID, Text Snippet, Topic, Language, LINE Clicked, Routed
- Summary statistics appended at the end
- Proper CSV escaping for special characters

## Security Considerations

1. **Password Protection**: Admin access is protected by a secure password
2. **PII Scrubbing**: All analytics data is automatically scrubbed of personally identifiable information
3. **No Persistent Sessions**: Authentication is required for each request
4. **Environment Variables**: Sensitive configuration is stored in environment variables
5. **Rate Limiting**: Consider implementing rate limiting for production use

## Performance

- **Data Limiting**: Conversation flows are limited to 20 entries for performance
- **Efficient Queries**: Database queries are optimized with proper indexing
- **Caching**: Consider implementing caching for frequently accessed data
- **Concurrent Requests**: Designed to handle multiple concurrent admin requests

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check that `ADMIN_PASSWORD` environment variable is set
   - Verify the password is correct
   - Ensure Authorization header format: `Bearer <password>`

2. **500 Internal Server Error**
   - Check database connection
   - Verify environment variables are properly configured
   - Check application logs for specific error details

3. **Empty Data**
   - Verify analytics are being collected (check `/api/chat` endpoint)
   - Check database connectivity
   - Ensure proper date range for the selected period

### Development

```bash
# Run tests
npm test -- admin --run

# Test specific functionality
npm test -- AdminDashboard --run
npm test -- stats --run

# Check admin API manually
curl -H "Authorization: Bearer test123" \
     "http://localhost:3000/api/admin/stats"
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live analytics
2. **Advanced Filtering**: Filter by topic, language, or date range
3. **Data Visualization**: Charts and graphs for better insights
4. **User Management**: Multiple admin users with different permissions
5. **Automated Reports**: Scheduled email reports for stakeholders
6. **Performance Metrics**: Response time tracking and error rate monitoring