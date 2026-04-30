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
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: __BACKGROUND__; font-family: __FONT_FAMILY__; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: __BACKGROUND__; padding: 32px 0;">
    <tr>
      <td align="center">
        <!--[if mso]>
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td>
        <![endif]-->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);">
          <!-- region:header -->
          <tr>
            <td style="background-color: __PRIMARY__; padding: 40px 40px 36px 40px; text-align: center; border-radius: 16px 16px 0 0;">
              <img src="{{logo_url}}" alt="{{company}}" width="{{logo_width}}" height="auto" style="display: block; margin: 0 auto; max-width: {{logo_width}}px; height: auto; border-radius: 8px;" />
              <!-- region:company-name -->
              <p style="margin: 14px 0 0 0; font-size: 14px; color: #ffffff; opacity: 0.9; letter-spacing: 0.5px; font-weight: 500; font-family: __FONT_FAMILY__;">{{company}}</p>
              <!-- /region:company-name -->
            </td>
          </tr>
          <!-- /region:header -->
          <!-- region:content -->
          <tr>
            <td style="padding: 44px 44px 36px 44px;">
              <!-- region:title -->
              <h1 style="margin: 0 0 18px 0; font-size: 26px; font-weight: 700; color: __TITLE_COLOR__; line-height: 1.3; font-family: __FONT_FAMILY__; text-align: left;">{{title}}</h1>
              <!-- /region:title -->
              <!-- region:body -->
              <p style="margin: 0 0 28px 0; font-size: 16px; color: __BODY_COLOR__; line-height: 1.65; font-family: __FONT_FAMILY__; text-align: left;">{{content}}</p>
              <!-- /region:body -->
              <!-- region:cta -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin: 8px 0 0 0;">
                <tr>
                  <td>
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{cta_url}}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="22%" stroke="f" fillcolor="__PRIMARY__">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">{{cta_text}}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="{{cta_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; background-color: __PRIMARY__; border-radius: 10px; border: none; font-family: __FONT_FAMILY__; mso-hide: all;">{{cta_text}}</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              <!-- /region:cta -->
            </td>
          </tr>
          <!-- /region:content -->
          <!-- region:divider -->
          <tr>
            <td style="padding: 0 44px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
            </td>
          </tr>
          <!-- /region:divider -->
          <!-- region:footer -->
          <tr>
            <td style="padding: 28px 44px 36px 44px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af; line-height: 1.5; font-family: __FONT_FAMILY__;">
                Você recebeu este email porque está inscrito em {{company}}.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5; font-family: __FONT_FAMILY__;">
                <a href="{{unsubscribe_url}}" style="color: __PRIMARY__; text-decoration: underline;">Descadastrar</a> · <a href="{{preferences_url}}" style="color: __PRIMARY__; text-decoration: underline;">Preferências</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #d1d5db; font-family: __FONT_FAMILY__;">
                {{company_address}}
              </p>
            </td>
          </tr>
          <!-- /region:footer -->
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
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
