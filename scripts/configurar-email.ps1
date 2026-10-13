Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Set-Location (Split-Path $PSScriptRoot -Parent)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$SITE = "https://lumeedu.com.br"

function Mensagem($texto, $icone = "Information") {
    [System.Windows.Forms.MessageBox]::Show($texto, "Lume - e-mails", "OK", $icone) | Out-Null
}

$urlSupabase = (Get-Content .env | Where-Object { $_ -match '^VITE_SUPABASE_URL=' }) -replace '^VITE_SUPABASE_URL=', ''
if (-not $urlSupabase) { Mensagem "Nao encontrei o Supabase no .env." "Error"; exit 1 }
$ref = ([uri]$urlSupabase).Host.Split('.')[0]

function Pedir($passo, $titulo, $explicacao, $senha) {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Lume - e-mails ($passo de 4)"
    $form.Size = New-Object System.Drawing.Size(560, 250)
    $form.StartPosition = "CenterScreen"
    $form.TopMost = $true
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false

    $t = New-Object System.Windows.Forms.Label
    $t.Text = $titulo
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $t.Location = New-Object System.Drawing.Point(15, 12)
    $t.Size = New-Object System.Drawing.Size(520, 24)
    $form.Controls.Add($t)

    $e = New-Object System.Windows.Forms.Label
    $e.Text = $explicacao
    $e.Location = New-Object System.Drawing.Point(15, 40)
    $e.Size = New-Object System.Drawing.Size(520, 60)
    $form.Controls.Add($e)

    $c = New-Object System.Windows.Forms.TextBox
    $c.Location = New-Object System.Drawing.Point(15, 105)
    $c.Size = New-Object System.Drawing.Size(515, 24)
    $c.UseSystemPasswordChar = $senha
    $form.Controls.Add($c)

    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = "Continuar"
    $ok.Location = New-Object System.Drawing.Point(340, 160)
    $ok.Size = New-Object System.Drawing.Size(95, 30)
    $ok.DialogResult = "OK"
    $form.AcceptButton = $ok
    $form.Controls.Add($ok)
    $cancelar = New-Object System.Windows.Forms.Button
    $cancelar.Text = "Cancelar"
    $cancelar.Location = New-Object System.Drawing.Point(440, 160)
    $cancelar.Size = New-Object System.Drawing.Size(90, 30)
    $cancelar.DialogResult = "Cancel"
    $form.CancelButton = $cancelar
    $form.Controls.Add($cancelar)

    $form.Add_Shown({ $form.Activate(); $c.Focus() })
    if ($form.ShowDialog() -ne "OK") { Write-Host "CANCELADO no passo $passo"; exit 1 }
    return $c.Text.Trim().Trim('"', "'")
}

$emailOk = '^[^@\s]+@[^@\s]+\.[^@\s]+$'

while ($true) {
    $login = Pedir 1 "Login SMTP do Brevo" "No Brevo: lumea (canto superior direito) > SMTP e API > aba SMTP.`nCopie o que aparece em 'Login' (algo como xxxx@smtp-brevo.com)." $false
    if ($login -match $emailOk) { break }
    Mensagem "Isso nao parece o Login SMTP. Ele tem formato de e-mail, como xxxx@smtp-brevo.com." "Warning"
}
Write-Host "PASSO 1 OK"

while ($true) {
    $chave = Pedir 2 "Chave SMTP do Brevo" "Na mesma pagina, a chave que voce gerou (comeca com xsmtpsib-).`nSe nao copiou na hora, clique em 'Gerar nova chave SMTP' e copie a nova." $true
    if ($chave.StartsWith("xkeysib-")) { Mensagem "Essa e a chave de API do Brevo, nao a chave SMTP. A chave SMTP comeca com xsmtpsib- e fica na aba SMTP." "Warning"; continue }
    if ($chave.Length -ge 20 -and $chave -notmatch '\s') { break }
    Mensagem "Essa chave parece incompleta. Copie a chave SMTP inteira (comeca com xsmtpsib-)." "Warning"
}
Write-Host "PASSO 2 OK"

while ($true) {
    $remetente = Pedir 3 "E-mail do remetente" "O e-mail que voce cadastrou e CONFIRMOU no Brevo em:`nlumea > Remetentes, dominios e IPs dedicados > Remetentes." $false
    if ($remetente -match $emailOk) { break }
    Mensagem "Digite um e-mail valido." "Warning"
}
Write-Host "PASSO 3 OK"

while ($true) {
    $token = Pedir 4 "Token de acesso do Supabase" "Em supabase.com/dashboard/account/tokens > Generate new token.`nPermissions > Application services > Auth: Read and write. Comeca com sbp_." $true
    if (-not $token.StartsWith("sbp_")) { Mensagem "O token do Supabase comeca com sbp_. Nao use a chave do projeto (eyJ... ou sb_...)." "Warning"; continue }
    try {
        Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" -Headers @{ Authorization = "Bearer $token" } | Out-Null
        break
    } catch {
        Write-Host "TOKEN RECUSADO: $($_.Exception.Message)"
        Mensagem "O Supabase recusou esse token. Gere outro com o projeto selecionado e, em Permissions > Application services > Auth, escolha Read and write." "Warning"
    }
}
Write-Host "PASSO 4 OK"

function Modelo($arquivo) { return [IO.File]::ReadAllText((Join-Path (Get-Location) "supabase\templates\$arquivo"), [Text.Encoding]::UTF8) }

$config = [ordered]@{
    external_email_enabled                = $true
    mailer_autoconfirm                    = $false
    site_url                              = $SITE
    uri_allow_list                        = "$SITE/**,http://localhost:8080/**,http://localhost:3000/**,http://localhost:5173/**"
    smtp_host                             = "smtp-relay.brevo.com"
    smtp_port                             = "587"
    smtp_user                             = $login
    smtp_pass                             = $chave
    smtp_admin_email                      = $remetente
    smtp_sender_name                      = "Lume"
    mailer_subjects_confirmation          = "Confirme seu e-mail na Lume"
    mailer_templates_confirmation_content = (Modelo "confirmacao.html")
    mailer_subjects_recovery              = "Crie sua nova senha da Lume"
    mailer_templates_recovery_content     = (Modelo "nova-senha.html")
    mailer_subjects_invite                = "Você foi convidada para a Lume"
    mailer_templates_invite_content       = (Modelo "convite.html")
    mailer_subjects_email_change          = "Confirme seu novo e-mail na Lume"
    mailer_templates_email_change_content = (Modelo "mudar-email.html")
}
$corpo = [Text.Encoding]::UTF8.GetBytes(($config | ConvertTo-Json -Depth 3))
try {
    Invoke-RestMethod -Method Patch -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json; charset=utf-8" -Body $corpo | Out-Null
} catch {
    Write-Host "CONFIG FALHOU: $($_.Exception.Message) $($_.ErrorDetails.Message)"
    Mensagem "O Supabase nao aceitou a configuracao. Veja a mensagem no chat." "Error"
    exit 1
}

Write-Host "REMETENTE: $remetente"
Write-Host "CONFIGURADO"
Mensagem "Pronto! Os e-mails da Lume agora saem pelo Brevo, em portugues."
