Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Set-Location (Split-Path $PSScriptRoot -Parent)
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$SITE = "https://lumeedu.com.br"
$ADMIN = "erickgdandrade@gmail.com"
$GESTOR_PILOTO = "devgang777@gmail.com"

function Mensagem($texto, $icone = "Information") {
    [System.Windows.Forms.MessageBox]::Show($texto, "Lume - convites", "OK", $icone) | Out-Null
}

$url = (Get-Content .env | Where-Object { $_ -match '^VITE_SUPABASE_URL=' }) -replace '^VITE_SUPABASE_URL=', ''
$ref = ([uri]$url).Host.Split('.')[0]

function PedirToken {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Lume - ativar convites"
    $form.Size = New-Object System.Drawing.Size(560, 250)
    $form.StartPosition = "CenterScreen"
    $form.TopMost = $true
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $t = New-Object System.Windows.Forms.Label
    $t.Text = "Token de acesso do Supabase"
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $t.Location = New-Object System.Drawing.Point(15, 12)
    $t.Size = New-Object System.Drawing.Size(520, 24)
    $form.Controls.Add($t)
    $e = New-Object System.Windows.Forms.Label
    $e.Text = "Comeca com sbp_. Precisa de: Auth (Read and write) e leitura das chaves do projeto (API keys / Secrets)."
    $e.Location = New-Object System.Drawing.Point(15, 40)
    $e.Size = New-Object System.Drawing.Size(520, 60)
    $form.Controls.Add($e)
    $c = New-Object System.Windows.Forms.TextBox
    $c.Location = New-Object System.Drawing.Point(15, 105)
    $c.Size = New-Object System.Drawing.Size(515, 24)
    $c.UseSystemPasswordChar = $true
    $form.Controls.Add($c)
    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = "Ativar"
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
    if ($form.ShowDialog() -ne "OK") { Write-Host "CANCELADO"; exit 1 }
    return $c.Text.Trim().Trim('"', "'")
}

while ($true) {
    $token = PedirToken
    if (-not $token.StartsWith("sbp_")) { Mensagem "O token do Supabase comeca com sbp_." "Warning"; continue }
    $h = @{ Authorization = "Bearer $token" }
    try {
        $chaves = @((Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/api-keys?reveal=true" -Headers $h) | ForEach-Object { $_ })
    } catch {
        Write-Host "SEM ACESSO AS CHAVES: $($_.Exception.Message)"
        Mensagem "Esse token nao consegue ler as chaves do projeto. Gere outro e, em Permissions, de leitura em 'API keys' (ou 'Secrets'), alem de Auth: Read and write." "Warning"
        continue
    }
    $item = $chaves | Where-Object { $_.name -eq "service_role" -and $_.api_key } | Select-Object -First 1
    if (-not $item) { $item = $chaves | Where-Object { $_.type -eq "secret" -and $_.api_key } | Select-Object -First 1 }
    if (-not $item -or $item.api_key -isnot [string] -or $item.api_key -match '[\*\s]') {
        Write-Host "CHAVE SECRETA NAO VEIO: $(($chaves | ForEach-Object { "$($_.name)/$($_.type)" }) -join ', ')"
        Mensagem "O token nao tem permissao para revelar a chave secreta. Gere outro com leitura de 'API keys' / 'Secrets'." "Warning"
        continue
    }
    try {
        Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" -Headers $h | Out-Null
    } catch {
        Mensagem "Esse token nao tem permissao de Auth. Gere outro com Auth: Read and write." "Warning"
        continue
    }
    break
}
$secreta = $item.api_key
Write-Host "PASSO 1 OK: chave secreta obtida ($($item.name))"

try {
    Invoke-RestMethod -Uri "$url/rest/v1/escolas?select=id&limit=1" -Headers @{ apikey = $secreta; Authorization = "Bearer $secreta" } | Out-Null
    Write-Host "CHAVE SECRETA CONFERIDA"
} catch {
    Write-Host "CHAVE SECRETA INVALIDA: $($_.Exception.Message)"
    Mensagem "A chave secreta obtida nao funcionou. Veja a mensagem no chat." "Error"
    exit 1
}

$saida = $secreta | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    Write-Host "CLOUDFLARE FALHOU: $saida"
    Mensagem "Nao consegui guardar a chave no Cloudflare. Veja a mensagem no chat." "Error"
    exit 1
}
Write-Host "PASSO 2 OK: chave guardada no Cloudflare"

function Modelo($arquivo) { return [IO.File]::ReadAllText((Join-Path (Get-Location) "supabase\templates\$arquivo"), [Text.Encoding]::UTF8) }
$config = [ordered]@{
    site_url                              = $SITE
    uri_allow_list                        = "$SITE/**,http://localhost:8080/**,http://localhost:3000/**,http://localhost:5173/**"
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
    Invoke-RestMethod -Method Patch -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" -Headers $h -ContentType "application/json; charset=utf-8" -Body $corpo | Out-Null
    Write-Host "PASSO 3 OK: e-mails atualizados"
} catch { Write-Host "E-MAILS FALHARAM: $($_.Exception.Message) $($_.ErrorDetails.Message)" }

$hs = @{ apikey = $secreta; Authorization = "Bearer $secreta" }
function Rest($metodo, $caminho, $corpo) {
    $params = @{ Method = $metodo; Uri = "$url$caminho"; Headers = $hs; ContentType = "application/json; charset=utf-8" }
    if ($null -ne $corpo) { $params.Body = [Text.Encoding]::UTF8.GetBytes(($corpo | ConvertTo-Json -Depth 5)) }
    return @((Invoke-RestMethod @params) | ForEach-Object { $_ })
}
function Convidar($email) {
    try {
        Rest "POST" "/auth/v1/invite" @{ email = $email } | Out-Null
        return "convite enviado"
    } catch {
        $msg = "$($_.ErrorDetails.Message)"
        if ($msg -match "already|registered|exists") { return "ja tinha conta" }
        return "FALHOU: $($_.Exception.Message) $msg"
    }
}

$escolas = @(Rest "GET" "/rest/v1/escolas?select=id,nome&nome=eq.Escola%20Piloto" $null)
$piloto = $escolas | Select-Object -First 1
if (-not $piloto) {
    $piloto = (Rest "POST" "/rest/v1/escolas?select=id,nome" @{ nome = "Escola Piloto" } | Select-Object -First 1)
}

$perfilGestor = @(Rest "GET" "/rest/v1/perfis?select=id&email=eq.$GESTOR_PILOTO" $null) | Select-Object -First 1
if ($perfilGestor) {
    $params = @{ Method = "POST"; Uri = "$url/rest/v1/vinculos?on_conflict=usuario,escola,papel"; Headers = ($hs + @{ Prefer = "resolution=merge-duplicates" }); ContentType = "application/json"; Body = (@{ usuario = $perfilGestor.id; escola = $piloto.id; papel = "gestor"; ativo = $true } | ConvertTo-Json) }
    Invoke-RestMethod @params | Out-Null
    $resGestor = "ja tinha conta: virou gestor da Escola Piloto"
} else {
    Rest "POST" "/rest/v1/convites" @{ escola = $piloto.id; email = $GESTOR_PILOTO; papel = "gestor" } | Out-Null
    $resGestor = Convidar $GESTOR_PILOTO
}
Write-Host "GESTOR ($GESTOR_PILOTO): $resGestor"

$resAdmin = Convidar $ADMIN
if ($resAdmin -eq "ja tinha conta") {
    $perfilAdmin = @(Rest "GET" "/rest/v1/perfis?select=id&email=eq.$ADMIN" $null) | Select-Object -First 1
    if ($perfilAdmin) {
        $params = @{ Method = "POST"; Uri = "$url/rest/v1/admins_lume?on_conflict=usuario"; Headers = ($hs + @{ Prefer = "resolution=ignore-duplicates" }); ContentType = "application/json"; Body = (@{ usuario = $perfilAdmin.id } | ConvertTo-Json) }
        Invoke-RestMethod @params | Out-Null
    }
}
Write-Host "ADMIN ($ADMIN): $resAdmin"

try {
    $fechar = [Text.Encoding]::UTF8.GetBytes((@{ disable_signup = $true } | ConvertTo-Json))
    Invoke-RestMethod -Method Patch -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" -Headers $h -ContentType "application/json" -Body $fechar | Out-Null
    Write-Host "PASSO 5 OK: cadastro aberto fechado"
} catch { Write-Host "NAO FECHOU CADASTRO: $($_.Exception.Message)" }

Write-Host "CONCLUIDO"
Mensagem "Pronto! Convites ativados.`n`nAdmin ($ADMIN): $resAdmin`nGestor da Escola Piloto ($GESTOR_PILOTO): $resGestor"
