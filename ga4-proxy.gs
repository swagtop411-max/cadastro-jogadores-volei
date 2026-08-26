const GA4_PROPERTY_ID = '532490731';
const API_TOKEN = 'se9i3Pf8Vc8dI-FqXwoolJstmaEjWXD6';

function doGet(e) {
  const token = e && e.parameter ? e.parameter.token : '';
  if (token !== API_TOKEN) return output({ ok:false, error:'unauthorized' }, e);
  try {
    const data = buildDashboard();
    return output(data, e);
  } catch (err) {
    return output({ ok:false, error:String(err && err.message || err) }, e);
  }
}

function output(data, e) {
  const callback = e && e.parameter ? e.parameter.callback : '';
  const json = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function request(dimensions, metrics, startDate, endDate, limit) {
  const req = AnalyticsData.newRunReportRequest();
  req.dateRanges = [Object.assign(AnalyticsData.newDateRange(), {
    startDate: startDate || '7daysAgo',
    endDate: endDate || 'today'
  })];
  req.dimensions = (dimensions || []).map(name => Object.assign(AnalyticsData.newDimension(), {name}));
  req.metrics = (metrics || []).map(name => Object.assign(AnalyticsData.newMetric(), {name}));
  req.limit = String(limit || 100);
  return AnalyticsData.Properties.runReport(req, 'properties/' + GA4_PROPERTY_ID);
}

function realtime() {
  const req = AnalyticsData.newRunRealtimeReportRequest();
  req.metrics = [Object.assign(AnalyticsData.newMetric(), {name:'activeUsers'})];
  return AnalyticsData.Properties.runRealtimeReport(req, 'properties/' + GA4_PROPERTY_ID);
}

function rows(report) {
  return (report && report.rows || []).map(row => ({
    dimensions: (row.dimensionValues || []).map(v => v.value),
    metrics: (row.metricValues || []).map(v => Number(v.value || 0))
  }));
}

function total(report) {
  const r = rows(report);
  if (!r.length) return [];
  return r[0].metrics;
}

function buildDashboard() {
  const totals = total(request([], ['activeUsers','newUsers','sessions','screenPageViews','eventCount','averageSessionDuration'], '7daysAgo', 'today', 1));
  const daily = rows(request(['date'], ['activeUsers','newUsers','sessions','screenPageViews'], '7daysAgo', 'today', 20));
  const devices = rows(request(['deviceCategory'], ['activeUsers','sessions','screenPageViews'], '7daysAgo', 'today', 10));
  const countries = rows(request(['country'], ['activeUsers','sessions'], '7daysAgo', 'today', 10));
  const pages = rows(request(['pagePath'], ['screenPageViews','activeUsers'], '7daysAgo', 'today', 10));
  const events = rows(request(['eventName'], ['eventCount','totalUsers'], '7daysAgo', 'today', 20));
  let realtimeUsers = 0;
  try { realtimeUsers = total(realtime())[0] || 0; } catch (_) {}
  return {
    ok:true,
    source:'Google Analytics Data API',
    propertyId:GA4_PROPERTY_ID,
    updatedAt:new Date().toISOString(),
    totals:{activeUsers:totals[0]||0,newUsers:totals[1]||0,sessions:totals[2]||0,views:totals[3]||0,events:totals[4]||0,avgSessionSeconds:totals[5]||0,realtimeUsers},
    daily,
    devices,
    countries,
    pages,
    events
  };
}
