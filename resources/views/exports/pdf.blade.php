<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: sans-serif; font-size: 12px; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  p { font-size: 10px; color: #666; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f5f5f5; border: 1px solid #ccc;
       padding: 6px 8px; text-align: left; font-weight: bold; }
  td { border: 1px solid #ccc; padding: 6px 8px; }
  tr:nth-child(even) td { background: #fafafa; }
</style>
</head>
<body>
  <h1>{{ $title }}</h1>
  <p>Generated: {{ now()->format('Y-m-d H:i') }}</p>
  <table>
    <thead><tr>
      @foreach($headings as $h)<th>{{ $h }}</th>@endforeach
    </tr></thead>
    <tbody>
      @foreach($rows as $row)
      <tr>
        @foreach((array)$row as $cell)<td>{{ $cell ?? '—' }}</td>@endforeach
      </tr>
      @endforeach
    </tbody>
  </table>
</body>
</html>
