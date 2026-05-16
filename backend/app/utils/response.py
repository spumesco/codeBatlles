from app.schemas.common import SuccessResponse, ErrorResponse


def success(data=None) -> SuccessResponse:
    return SuccessResponse(data=data)


def error(message: str) -> ErrorResponse:
    return ErrorResponse(message=message)
