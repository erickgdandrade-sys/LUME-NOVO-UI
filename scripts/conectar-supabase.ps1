Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Set-Location (Split-Path $PSScriptRoot -Parent)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$SITE = "https://lumeedu.com.br"

function Mensagem($texto, $icone = "Information") {
    [System.Windows.Forms.MessageBox]::Show($texto, "Lume + Supabase", "OK", $icone) | Out-Null
}

function PedirDados {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Lume - conectar ao Supabase"
    $form.Size = New-Object System.Drawing.Size(540, 300)
    $form.StartPosition = "CenterScreen"
    $form.TopMost = $true
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false

    $r1 = New-Object System.Windows.Forms.Label
    $r1.Text = "Cole a chave publica do projeto (anon / publishable) ou o token de acesso (sbp_...):"
    $r1.Location = New-Object System.Drawing.Point(15, 15)
    $r1.Size = New-Object System.Drawing.Size(500, 20)
    $form.Controls.Add($r1)

    $chave = New-Object System.Windows.Forms.TextBox
    $chave.Location = New-Object System.Drawing.Point(15, 40)
    $chave.Size = New-Object System.Drawing.Size(495, 24)
    $chave.UseSystemPasswordChar = $true
    $form.Controls.Add($chave)

    $r2 = New-Object System.Windows.Forms.Label
    $r2.Text = "Project URL (so se a chave comecar com sb_publishable_), ex.: https://abcd.supabase.co"
    $r2.Location = New-Object System.Drawing.Point(15, 85)
    $r2.Size = New-Object System.Drawing.Size(500, 20)
    $form.Controls.Add($r2)

    $urlCaixa = New-Object System.Windows.Forms.TextBox
    $urlCaixa.Location = New-Object System.Drawing.Point(15, 110)
    $urlCaixa.Size = New-Object System.Drawing.Size(495, 24)
    $form.Controls.Add($urlCaixa)

    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = "Conectar"
    $ok.Location = New-Object System.Drawing.Point(330, 190)
    $ok.Size = New-Object System.Drawing.Size(85, 30)
    $ok.DialogResult = "OK"
    $form.AcceptButton = $ok
    $form.Controls.Add($ok)

    $cancelar = New-Object System.Windows.Forms.Button
    $cancelar.Text = "Cancelar"
    $cancelar.Location = New-Object System.Drawing.Point(425, 190)
    $cancelar.Size = New-Object System.Drawing.Size(85, 30)
    $cancelar.DialogResult = "Cancel"
    $form.CancelButton = $cancelar
    $form.Controls.Add($cancelar)

    $form.Add_Shown({ $form.Activate(); $chave.Focus() })
    if ($form.ShowDialog() -ne "OK") { return $null }
    return @{ chave = $chave.Text.Trim().Trim('"', "'"); url = $urlCaixa.Text.Trim().TrimEnd('/') }
}

function LerJwt($jwt) {
    $partes = $jwt.Split('.')
    if ($partes.Count -lt 2) { return $null }
    $b = $partes[1].Replace('-', '+').Replace('_', '/')
    switch ($b.Length % 4) { 2 { $b += '==' } 3 { $b += '=' } }
    try { return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b)) | ConvertFrom-Json } catch { return $null }
}

function ChaveFunciona($url, $chave) {
    try {
        Invoke-RestMethod -Uri "$url/auth/v1/settings" -Headers @{ apikey = $chave } -TimeoutSec 20 | Out-Null
        return $true
    } catch { return $false }
}

while ($true) {
    $d = PedirDados
    if ($null -eq $d) { Write-Host "CANCELADO"; exit 1 }
    $v = $d.chave
    $url = $null; $publica = $null; $token = $null

    if ($v.StartsWith("sb_secret_")) {
        Mensagem "Essa e a chave SECRETA do projeto: ela nunca deve ir para o site. Use a chave publica (anon ou publishable), que fica na mesma tela." "Warning"
        continue
    }
    if ($v.StartsWith("sbp_")) {
        $token = $v
        try {
            $h = @{ Authorization = "Bearer $token" }
            $projetos = @(Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects" -Headers $h)
        } catch {
            Mensagem "O Supabase recusou esse token. Gere um novo em Account > Access Tokens e cole o token inteiro." "Warning"
            continue
        }
        if ($projetos.Count -eq 0) { Mensagem "Nao encontrei nenhum projeto na sua conta." "Error"; continue }
        $projeto = $projetos | Sort-Object created_at -Descending | Select-Object -First 1
        Write-Host "PROJETO: $($projeto.name) ($($projeto.id))"
        $chaves = @(Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$($projeto.id)/api-keys" -Headers $h)
        $item = $chaves | Where-Object { $_.name -eq "anon" } | Select-Object -First 1
        if (-not $item) { $item = $chaves | Where-Object { $_.type -eq "publishable" } | Select-Object -First 1 }
        $publica = $item.api_key
        $url = "https://$($projeto.id).supabase.co"
    } elseif ($v.StartsWith("eyJ")) {
        $jwt = LerJwt $v
        if ($null -eq $jwt) { Mensagem "Nao consegui ler essa chave. Copie a chave inteira." "Warning"; continue }
        if ($jwt.role -eq "service_role") {
            Mensagem "Essa e a chave SECRETA (service_role): ela nunca deve ir para o site. Use a chave 'anon public', que fica na mesma tela." "Warning"
            continue
        }
        $publica = $v
        $url = if ($d.url) { $d.url } else { "https://$($jwt.ref).supabase.co" }
    } elseif ($v.StartsWith("sb_publishable_")) {
        if (-not ($d.url -match '^https://[a-z0-9-]+\.supabase\.co$')) {
            Mensagem "Com essa chave, preciso tambem do Project URL (ex.: https://abcd.supabase.co). Ele fica em Project Settings > Data API." "Warning"
            continue
        }
        $publica = $v
        $url = $d.url
    } else {
        Mensagem "Nao reconheci esse codigo. Ele deve comecar com eyJ, sb_publishable_ ou sbp_. Veja em Project Settings > API Keys." "Warning"
        continue
    }

    if (ChaveFunciona $url $publica) { break }
    Mensagem "O Supabase nao aceitou essa chave para o projeto $url. Confira se copiou a chave inteira e o Project URL certo." "Warning"
}

Write-Host "URL: $url"
Write-Host "CHAVE PUBLICA OK: $($publica.Substring(0, 10))..."

$siteAjustado = $false
if ($token) {
    try {
        $config = @{
            site_url       = $SITE
            uri_allow_list = "$SITE/**,http://localhost:8080/**,http://localhost:3000/**,http://localhost:5173/**"
        } | ConvertTo-Json
        $ref = ([uri]$url).Host.Split('.')[0]
        Invoke-RestMethod -Method Patch -Uri "https://api.supabase.com/v1/projects/$ref/config/auth" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $config | Out-Null
        $siteAjustado = $true
    } catch { Write-Host "NAO AJUSTOU SITE URL: $($_.Exception.Message)" }
}
Write-Host "SITE URL AJUSTADO: $siteAjustado"

$linhas = @()
if (Test-Path .env) { $linhas = @(Get-Content .env | Where-Object { $_ -notmatch '^VITE_SUPABASE_(URL|ANON_KEY)=' }) }
$linhas += "VITE_SUPABASE_URL=$url"
$linhas += "VITE_SUPABASE_ANON_KEY=$publica"
[IO.File]::WriteAllLines((Join-Path (Get-Location) ".env"), $linhas)
Write-Host "CONECTADO"

if ($siteAjustado) {
    Mensagem "Pronto! A Lume foi conectada ao seu projeto do Supabase."
} else {
    Mensagem "Conectado! Falta so um ajuste no painel do Supabase:`n`nAuthentication > URL Configuration > Site URL:`n$SITE`n`nDepois clique em Save."
}
