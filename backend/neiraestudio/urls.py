"""
URL configuration for neiraestudio project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def home(request):
    return HttpResponse(
        """
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Neira Estudio API</title>
            <style>
              body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; background: #0b1220; color: #e5e7eb; }
              .wrap { max-width: 900px; margin: 0 auto; padding: 48px 20px; }
              .card { background: #0f172a; border: 1px solid #1f2937; border-radius: 16px; padding: 20px; }
              h1 { margin: 0 0 8px; font-size: 22px; }
              p { margin: 0 0 16px; color: #cbd5e1; }
              a { color: #fb923c; text-decoration: none; font-weight: 700; }
              a:hover { text-decoration: underline; }
              .grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 16px; }
              @media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }
              .item { padding: 14px 16px; border-radius: 14px; border: 1px solid #243041; background: #0b1220; }
              .small { font-size: 12px; color: #94a3b8; margin-top: 6px; }
              code { background: #111827; padding: 2px 6px; border-radius: 8px; border: 1px solid #1f2937; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="card">
                <h1>Neira Estudio — Backend</h1>
                <p>Servicio activo. Accesos rápidos:</p>
                <div class="grid">
                  <div class="item">
                    <a href="/api/">API Root</a>
                    <div class="small">Endpoints DRF (ej: <code>/api/cases/</code>)</div>
                  </div>
                  <div class="item">
                    <a href="/admin/">Django Admin</a>
                    <div class="small">Solo si lo usas en producción (CSRF/hosts configurados)</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
        """,
        content_type="text/html",
    )

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
