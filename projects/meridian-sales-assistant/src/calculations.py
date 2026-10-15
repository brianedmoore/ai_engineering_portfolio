def add(values: list[float]) -> float:
    return sum(values)


def subtract(a: float, b: float) -> float:
    return a - b


def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("Cannot divide by zero.")
    return a / b


def percentage(numerator: float, denominator: float) -> float:
    if denominator == 0:
        raise ValueError("Cannot calculate percentage with zero denominator.")
    return (numerator / denominator) * 100


def difference(a: float, b: float) -> float:
    return abs(a - b)


def ratio(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("Cannot calculate ratio with zero denominator.")
    return a / b

def execute_operation(operation: str, values: list[float]) -> float:
    if operation == "sum":
        return add(values)

    if operation == "subtract":
        return subtract(values[0], values[1])

    if operation == "divide":
        return divide(values[0], values[1])

    if operation == "percentage":
        return percentage(values[0], values[1])

    if operation == "difference":
        return difference(values[0], values[1])

    if operation == "ratio":
        return ratio(values[0], values[1])

    raise ValueError(f"Unsupported operation: {operation}")