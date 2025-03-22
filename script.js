document.addEventListener('DOMContentLoaded', function() {
    // DOM要素の取得
    const initialInvestmentInput = document.getElementById('initialInvestment');
    const monthlyContributionInput = document.getElementById('monthlyContribution');
    const investmentPeriodInput = document.getElementById('investmentPeriod');
    const periodValueSpan = document.getElementById('periodValue');
    const annualReturnInput = document.getElementById('annualReturn');
    const inflationRateInput = document.getElementById('inflationRate');
    const riskModeSelect = document.getElementById('riskMode');
    const crashSettingsDiv = document.getElementById('crashSettings');
    const volatilitySettingsDiv = document.getElementById('volatilitySettings');
    const crashYearInput = document.getElementById('crashYear');
    const crashPercentageInput = document.getElementById('crashPercentage');
    const volatilityInput = document.getElementById('volatility');
    const simulateBtn = document.getElementById('simulateBtn');
    
    // 結果表示要素
    const finalAmountP = document.getElementById('finalAmount');
    const realFinalAmountP = document.getElementById('realFinalAmount');
    const totalInvestedP = document.getElementById('totalInvested');
    const totalReturnsP = document.getElementById('totalReturns');
    
    // グラフ
    let investmentChart = null;
    
    // 運用期間スライダーの値を表示
    investmentPeriodInput.addEventListener('input', function() {
        periodValueSpan.textContent = this.value;
        // 運用期間が変更されたら、暴落年の最大値も調整
        crashYearInput.max = this.value;
        if (parseInt(crashYearInput.value) > parseInt(this.value)) {
            crashYearInput.value = this.value;
        }
    });
    
    // リスクモードの変更時の処理
    riskModeSelect.addEventListener('change', function() {
        if (this.value === 'crash') {
            crashSettingsDiv.classList.remove('hidden');
            volatilitySettingsDiv.classList.add('hidden');
        } else if (this.value === 'volatility') {
            crashSettingsDiv.classList.add('hidden');
            volatilitySettingsDiv.classList.remove('hidden');
        } else {
            crashSettingsDiv.classList.add('hidden');
            volatilitySettingsDiv.classList.add('hidden');
        }
    });
    
    // 通貨フォーマット関数
    function formatCurrency(value) {
        return new Intl.NumberFormat('ja-JP', { 
            style: 'currency', 
            currency: 'JPY',
            maximumFractionDigits: 0
        }).format(value);
    }
    
    // シミュレーション実行
    simulateBtn.addEventListener('click', runSimulation);
    
    function runSimulation() {
        // 入力値の取得
        const initialInvestment = parseFloat(initialInvestmentInput.value);
        const monthlyContribution = parseFloat(monthlyContributionInput.value);
        const investmentPeriod = parseInt(investmentPeriodInput.value);
        const annualReturn = parseFloat(annualReturnInput.value) / 100;
        const inflationRate = parseFloat(inflationRateInput.value) / 100;
        const riskMode = riskModeSelect.value;
        
        // リスク設定の取得
        let crashYear = parseInt(crashYearInput.value);
        let crashPercentage = parseFloat(crashPercentageInput.value) / 100;
        let volatility = parseFloat(volatilityInput.value) / 100;
        
        // シミュレーション実行
        const results = simulateInvestment(
            initialInvestment,
            monthlyContribution,
            investmentPeriod,
            annualReturn,
            inflationRate,
            riskMode,
            crashYear,
            crashPercentage,
            volatility
        );
        
        // 結果の表示
        displayResults(results);
    }
    
    // 投資シミュレーション関数
    function simulateInvestment(
        initialInvestment,
        monthlyContribution,
        investmentPeriod,
        annualReturn,
        inflationRate,
        riskMode,
        crashYear,
        crashPercentage,
        volatility
    ) {
        const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
        const monthlyInflation = Math.pow(1 + inflationRate, 1/12) - 1;
        const totalMonths = investmentPeriod * 12;
        
        let currentValue = initialInvestment;
        let realCurrentValue = initialInvestment;
        let totalContributions = initialInvestment;
        
        const nominalValues = [currentValue];
        const realValues = [realCurrentValue];
        const contributionValues = [totalContributions];
        const labels = ['0'];
        
        // 通常シミュレーション、ボラティリティ考慮、または大暴落シナリオ
        for (let month = 1; month <= totalMonths; month++) {
            // 毎月の積立
            currentValue += monthlyContribution;
            totalContributions += monthlyContribution;
            
            // リターン計算
            let monthReturn = monthlyReturn;
            
            // リスクモードに応じた調整
            if (riskMode === 'volatility') {
                // ボラティリティを考慮したランダムなリターン
                const monthlyVol = volatility / Math.sqrt(12);
                const randomFactor = normalRandom() * monthlyVol;
                monthReturn = monthReturn + randomFactor;
            } else if (riskMode === 'crash' && Math.floor(month / 12) + 1 === crashYear) {
                // 大暴落が指定年に発生
                if (month % 12 === 1) { // その年の最初の月に暴落
                    monthReturn = -crashPercentage;
                }
            }
            
            // 資産の成長
            currentValue = currentValue * (1 + monthReturn);
            
            // インフレ調整後の実質価値
            const inflationFactor = Math.pow(1 + monthlyInflation, month);
            realCurrentValue = currentValue / inflationFactor;
            
            // 年ごとに記録
            if (month % 12 === 0) {
                const year = month / 12;
                nominalValues.push(currentValue);
                realValues.push(realCurrentValue);
                contributionValues.push(totalContributions);
                labels.push(year.toString());
            }
        }
        
        return {
            nominalValues,
            realValues,
            contributionValues,
            labels,
            finalAmount: nominalValues[nominalValues.length - 1],
            realFinalAmount: realValues[realValues.length - 1],
            totalContributions: totalContributions,
            totalReturns: nominalValues[nominalValues.length - 1] - totalContributions
        };
    }
    
    // 結果表示関数
    function displayResults(results) {
        // 結果サマリーの更新
        finalAmountP.textContent = formatCurrency(results.finalAmount);
        realFinalAmountP.textContent = formatCurrency(results.realFinalAmount);
        totalInvestedP.textContent = formatCurrency(results.totalContributions);
        totalReturnsP.textContent = formatCurrency(results.totalReturns);
        
        // グラフの更新
        updateChart(results);
    }
    
    // グラフ更新関数
    function updateChart(results) {
        const ctx = document.getElementById('investmentChart').getContext('2d');
        
        // 既存のグラフがあれば破棄
        if (investmentChart) {
            investmentChart.destroy();
        }
        
        // 新しいグラフを作成
        investmentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: results.labels,
                datasets: [
                    {
                        label: '名目資産額',
                        data: results.nominalValues,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true
                    },
                    {
                        label: '実質資産額（インフレ調整後）',
                        data: results.realValues,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: true
                    },
                    {
                        label: '投資総額',
                        data: results.contributionValues,
                        borderColor: 'rgb(107, 114, 128)',
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                        borderWidth: 2,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '年数'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '金額（円）'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.raw);
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 正規分布の乱数生成（ボックス・ミュラー法）
    function normalRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    
    // 初期シミュレーションを実行
    runSimulation();
}); 