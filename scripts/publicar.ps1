param([switch]$SoChave)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Set-Location (Split-Path $PSScriptRoot -Parent)
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

function Mensagem($texto, $icone = "Information") {
    [System.Windows.Forms.MessageBox]::Show($texto, "Lume", "OK", $icone) | Out-Null
}

function PedirChave {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Lume - chave da IA"
    $form.Size = New-Object System.Drawing.Size(460, 210)
    $form.StartPosition = "CenterScreen"
    $form.TopMost = $true
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false

    $rotulo = New-Object System.Windows.Forms.Label
    $rotulo.Text = "Cole aqui a chave do Gemini (copiada do Google AI Studio):"
    $rotulo.Location = New-Object System.Drawing.Point(15, 20)
    $rotulo.Size = New-Object System.Drawing.Size(420, 20)
    $form.Controls.Add($rotulo)

    $caixa = New-Object System.Windows.Forms.TextBox
    $caixa.Location = New-Object System.Drawing.Point(15, 50)
    $caixa.Size = New-Object System.Drawing.Size(415, 24)
    $caixa.UseSystemPasswordChar = $true
    $form.Controls.Add($caixa)

    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = "Salvar"
    $ok.Location = New-Object System.Drawing.Point(250, 110)
    $ok.Size = New-Object System.Drawing.Size(85, 30)
    $ok.DialogResult = "OK"
    $form.AcceptButton = $ok
    $form.Controls.Add($ok)

    $cancelar = New-Object System.Windows.Forms.Button
    $cancelar.Text = "Cancelar"
    $cancelar.Location = New-Object System.Drawing.Point(345, 110)
    $cancelar.Size = New-Object System.Drawing.Size(85, 30)
    $cancelar.DialogResult = "Cancel"
    $form.CancelButton = $cancelar
    $form.Controls.Add($cancelar)

    $form.Add_Shown({ $form.Activate(); $caixa.Focus() })
    if ($form.ShowDialog() -ne "OK") { return $null }
    return $caixa.Text.Trim()
}

if ((npx wrangler whoami 2>&1 | Out-String) -match "not authenticated") {
    Write-Host "PASSO 1: autorize o Cloudflare no navegador..."
    npx wrangler login
}
if ((npx wrangler whoami 2>&1 | Out-String) -match "not authenticated") {
    Mensagem "O login no Cloudflare nao foi concluido. Tente de novo." "Error"
    exit 1
}
Write-Host "LOGIN OK"

$endereco = ""
if (-not $SoChave) {
    Write-Host "PASSO 2: publicando o site..."
    $saida = npm run deploy 2>&1 | Out-String
    Write-Host $saida
    if ($LASTEXITCODE -ne 0) {
        Mensagem "Nao foi possivel publicar o site. Veja a mensagem no chat." "Error"
        exit 1
    }
    $endereco = ([regex]::Match($saida, "https://[a-z0-9.-]+\.workers\.dev")).Value
    Write-Host "PUBLICADO: $endereco"
}

function ChaveValida($chave) {
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "https://generativelanguage.googleapis.com/v1beta/models" `
            -Headers @{ "x-goog-api-key" = $chave } -TimeoutSec 20 | Out-Null
        return $true
    } catch {
        return $false
    }
}

while ($true) {
    $chave = PedirChave
    if ($null -eq $chave) {
        Mensagem "Site publicado, mas sem a chave a IA nao funciona. Rode de novo quando quiser."
        exit 1
    }
    $chave = $chave.Trim('"', "'", ' ')
    if (ChaveValida $chave) { break }
    Write-Host "CHAVE RECUSADA PELO GOOGLE"
    Mensagem "O Google recusou esse texto: ele nao e uma chave valida.`n`nNo Google AI Studio (aistudio.google.com/apikey), clique no icone de copiar ao lado da chave. Ela comeca com AIza e tem cerca de 39 letras e numeros. Nao copie o nome da chave nem o numero do projeto." "Warning"
}
Write-Host "CHAVE TESTADA OK"
$chave | npx wrangler secret put GEMINI_API_KEY 2>&1 | Out-String | Write-Host
if ($LASTEXITCODE -ne 0) {
    Mensagem "Nao foi possivel salvar a chave. Veja a mensagem no chat." "Error"
    exit 1
}
Write-Host "CHAVE SALVA"
if (-not $endereco) { $endereco = "https://lumeedu.com.br" }
Mensagem "Pronto! A Lume esta no ar com IA:`n`n$endereco"
