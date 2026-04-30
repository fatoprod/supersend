import { ExtractedBrand } from "./brandExtractor";

/**
 * Email-safe HTML template (replica do DEFAULT_HTML_TEMPLATE de TemplateEditorPage),
 * mas com placeholders __PRIMARY__/__TITLE_COLOR__/__BODY_COLOR__/__BACKGROUND__/__FONT_FAMILY__
 * para serem substituídos pela marca extraída. As variáveis Mustache {{...}} permanecem
 * intactas para serem preenchidas pelo processCampaign.
 */
const EMAIL_BASE_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: __BACKGROUND__; font-family: __FONT_FAMILY__; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: __BACKGROUND__; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="background-color: __PRIMARY__; padding: 32px 40px; text-align: center;">
              <img src="{{logo_url}}" alt="{{company}}" width="{{logo_width}}" height="auto" style="display: block; margin: 0 auto; max-width: {{logo_width}}px; height: auto;" />
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #ffffff; opacity: 0.85; letter-spacing: 0.5px;">{{company}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: __TITLE_COLOR__; line-height: 1.3;">{{title}}</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: __BODY_COLOR__; line-height: 1.6;">{{content}}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 8px 0 0 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: __PRIMARY__;">
                    <a href="{{cta_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">{{cta_text}}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 32px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                Você recebeu este email porque está inscrito em {{company}}.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                <a href="{{unsubscribe_url}}" style="color: __PRIMARY__; text-decoration: underline;">Descadastrar</a> · <a href="{{preferences_url}}" style="color: __PRIMARY__; text-decoration: underline;">Preferências</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #d1d5db;">
                {{company_address}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildHtml(brand: ExtractedBrand): string {
  return EMAIL_BASE_HTML
    .replaceAll("__PRIMARY__", escapeAttr(brand.colors.primary))
    .replaceAll("__TITLE_COLOR__", escapeAttr(brand.colors.titleText))
    .replaceAll("__BODY_COLOR__", escapeAttr(brand.colors.bodyText))
    .replaceAll("__BACKGROUND__", escapeAttr(brand.colors.background))
    .replaceAll("__FONT_FAMILY__", escapeAttr(brand.fontFamily));
}
