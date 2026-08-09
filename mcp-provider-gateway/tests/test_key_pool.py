from app.key_pool import KeyPool


def test_round_robin():
    pool = KeyPool(["a", "b", "c"])
    assert pool.next_key() == "a"
    assert pool.next_key() == "b"
    assert pool.next_key() == "c"
    assert pool.next_key() == "a"


def test_empty_pool():
    pool = KeyPool([])
    try:
        pool.next_key()
    except RuntimeError as exc:
        assert "No API key" in str(exc)
    else:
        raise AssertionError("Expected RuntimeError")
