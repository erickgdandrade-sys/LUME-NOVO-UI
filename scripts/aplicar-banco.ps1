param([string]$Arquivo)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Set-Location (Split-Path $PSScriptRoot -Parent)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

function Mensagem($texto, $icone = "Information") {
    [System.Windows.Forms.MessageBox]::Show($texto, "Lume - banco de dados", "OK", $icone) | Out-Null
}

$url = (Get-Content .env | Where-Object { $_ -match '^VITE_SUPABASE_URL=' }) -replace '^VITE_SUPABASE_URL=', ''
$ref = ([uri]$url).Host.Split('.')[0]
if (-not $Arquivo) {
    $Arquivo = (Get-ChildItem supabase/migrations/*.sql | Sort-Object Name | Select-Object -Last 1).FullName
}
$nome = Split-Path $Arquivo -Leaf
$sql = [IO.File]::ReadAllText((Resolve-Path $Arquivo), [Text.Encoding]::UTF8)

function PedirToken {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Lume - banco de dados"
    $form.Size = New-Object System.Drawing.Size(560, 240)
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
    $e.Text = "Vai aplicar: $nome`nComeca com sbp_. Precisa poder rodar SQL (Database: Read and write).`nSe preferir, clique em Cancelar: o SQL vai para a area de transferencia."
    $e.Location = New-Object System.Drawing.Point(15, 40)
    $e.Size = New-Object System.Drawing.Size(520, 60)
    $form.Controls.Add($e)
    $caixa = New-Object System.Windows.Forms.TextBox
    $caixa.Location = New-Object System.Drawing.Point(15, 108)
    $caixa.Size = New-Object System.Drawing.Size(515, 26)
    $caixa.UseSystemPasswordChar = $true
    $form.Controls.Add($caixa)
    $ok = New-Object System.Windows.Forms.Button
    $ok.Text = "Aplicar"
    $ok.Location = New-Object System.Drawing.Point(345, 150)
    $ok.Size = New-Object System.Drawing.Size(90, 30)
    $ok.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.AcceptButton = $ok
    $form.Controls.Add($ok)
    $cancelar = New-Object System.Windows.Forms.Button
    $cancelar.Text = "Cancelar"
    $cancelar.Location = New-Object System.Drawing.Point(440, 150)
    $cancelar.Size = New-Object System.Drawing.Size(90, 30)
    $cancelar.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
    $form.CancelButton = $cancelar
    $form.Controls.Add($cancelar)
    $form.Add_Shown({ $caixa.Focus() })
    if ($form.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
    return ($caixa.Text -replace '\s', '')
}

function PeloEditor($motivo) {
    Set-Clipboard -Value $sql
    Start-Process "https://supabase.com/dashboard/project/$ref/sql/new"
    Mensagem "$motivo`n`nO SQL de $nome ja esta copiado. No editor que abriu, cole (Ctrl+V) e clique em Run."
}

$token = PedirToken
if (-not $token) { PeloEditor "Sem token."; exit 0 }

try {
    $corpo = @{ query = $sql } | ConvertTo-Json -Compress
    Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$ref/database/query" `
        -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json; charset=utf-8" `
        -Body ([Text.Encoding]::UTF8.GetBytes($corpo)) | Out-Null
    Write-Output "APLICADO: $nome"
    Mensagem "Pronto! $nome foi aplicado no banco."
} catch {
    $codigo = $_.Exception.Response.StatusCode.value__
    Write-Output "FALHOU ($codigo): $($_.ErrorDetails.Message)"
    if ($codigo -eq 401 -or $codigo -eq 403) {
        PeloEditor "Esse token nao tem permissao para rodar SQL."
    } else {
        PeloEditor "O Supabase recusou o SQL (codigo $codigo)."
    }
}
