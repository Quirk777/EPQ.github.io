from report_generator import generate_pdf_report

fake_result = {
    "aggregates": {
        "structural clarity load": {"average": 2.8},
        "change volatility load": {"average": 2.2},
        "autonomy & judgment load": {"average": 3.1},
        "interpersonal coordination intensity": {"average": 2.5},
    }
}

generate_pdf_report(
    applicant_result=fake_result,
    employer_environment="Standard",
    candidate_id="A-TEST-001",
    output_dir="output",
    auto_open=True
)
