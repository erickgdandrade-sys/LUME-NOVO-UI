Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Set-Location (Split-Path $PSScriptRoot -Parent)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

function Mensagem($texto, $icone = "Information") {
    [System.Windows.Forms.MessageBox]::Show($texto, "Lume - avisos por e-mail", "OK", $icone) | Out-Null
}

function PedirChave {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Lume - avisos por e-mail"
    $form.Size = New-Object System.Drawing.Size(560, 220)
    $form.StartPosition = "CenterScreen"
    $form.TopMost = $true
    $form.FormBorderStyle = "FixedDialog"
    $form.MaximizeBox = $false
    $t = New-Object System.Windows.Forms.Label
    $t.Text = "Chave de API do Brevo"
    $t.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $t.Location = New-Object System.Drawing.Point(15, 12)
    $t.Size = New-Object System.Drawing.Size(520, 24)
    $form.Controls.Add($t)
    $e = New-Object System.Windows.Forms.Label
    $e.Text = "Comeca com xkeysib- (nao e a chave SMTP, que comeca com xsmtpsib-)."
    $e.Location = New-Object System.Drawing.Point(15, 40)
    $e.Size = New-Object System.Drawing.Size(520, 36)
    $form.Controls.Add($e)
    $caixa = New-Object System.Windows.Forms.TextBox
    $caixa.Location = New-Object System.Drawing.Point(15, 82)
    $caixa.Size = New-Object System.Drawing.Size(515, 26)
    $caixa.UseSystemPasswordChar = $true
    $form.Controls.Add($caixa)
    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = "Salvar"
    $ok.Location = New-Object System.Drawing.Point(345, 125)
    $ok.Size = New-Object System.Drawing.Size(90, 30)
    $ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.AcceptButton = $ok
    $form.Controls.Add($ok)
    $cancelar = New-Object System.Windows.Forms.Button
    $cancelar.Text = "Cancelar"
    $cancelar.Location = New-Object System.Drawing.Point(440, 125)
    $cancelar.Size = New-Object System.Drawing.Size(90, 30)
    $cancelar.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $form.CancelButton = $cancelar
    $form.Controls.Add($cancelar)
    $form.Add_Shown({ $caixa.Focus() })
    if ($form.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
    return ($caixa.Text -replace '\s', '')
}

while ($true) {
    $chave = PedirChave
    if (-not $chave) { Write-Output "CANCELADO"; exit 0 }
    if (-not $chave.StartsWith("xkeysib-")) {
        Mensagem "Essa nao parece a chave de API (deve comecar com xkeysib-). Tente de novo." "Warning"
        continue
    }
    try {
        $conta = Invoke-RestMethod -Uri "https://api.brevo.com/v3/account" -Headers @{ "api-key" = $chave; accept = "application/json" }
        Write-Output "CHAVE OK (conta Brevo: $($conta.email))"
        break
    } catch {
        $codigo = $_.Exception.Response.StatusCode.value__
        Write-Output "BREVO RECUSOU ($codigo)"
        Mensagem "O Brevo nao aceitou essa chave (codigo $codigo). Confira se copiou inteira e tente de novo." "Warning"
    }
}

$chave | npx wrangler secret put BREVO_API_KEY | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Output "SALVA NO CLOUDFLARE"
    Mensagem "Pronto! Os avisos por e-mail dos pedidos de demonstracao estao ligados."
} else {
    Write-Output "FALHOU AO SALVAR"
    Mensagem "Nao foi possivel salvar a chave no Cloudflare." "Error"
    exit 1
}
