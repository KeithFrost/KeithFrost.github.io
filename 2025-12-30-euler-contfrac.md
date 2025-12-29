---
summary: >-
  Solving Project Euler 57, 64-65, and 66 using Elixir.
---

<!-- livebook:{"autosave_interval_s":30} -->

## Project Euler Problems 57, 64, 65, and 66

This is a set of problems I find particularly interesting and
satisfying to solve, because they all involve learning about continued
fraction expansions, mostly to represent irrational square roots, and
this topic is absolutely fascinating to me.  I hope you also find it
interesting.

## Represent Irrational Square Roots of Integers as Continued Fractions

The leading integer part of the continued fraction will of course be
given by the `isqrt` function.  For mathematical rigor, it is nice to
define this solely in terms of integer operations.

```elixir
defmodule Isqrt do
  def isqrt(x2, est \\ 1) do
    est1 = div(est + 1 + div(x2 + est - 1, est), 2)
    if est1 == est do
      if est1 * est1 > x2 do
        est1 - 1
      else
        est1
      end
    else
      isqrt(x2, est1)
    end
  end
end
```

<!-- livebook:{"output":true} -->

```
{:module, Isqrt, <<70, 79, 82, 49, 0, 0, 8, ...>>, ...}
```

It's nice to see some examples that this actually works, so:

```elixir
[1, 2, 3, 4, 16, 100, 10**6, 10**12] |> Enum.flat_map(fn i ->
  i2 = i * i
  -1..0 |> Enum.map(fn d ->
    x = i2 + d
    {x, Isqrt.isqrt(x)}
    end)
  end)
```

<!-- livebook:{"output":true} -->

```
[
  {0, 0},
  {1, 1},
  {3, 1},
  {4, 2},
  {8, 2},
  {9, 3},
  {15, 3},
  {16, 4},
  {255, 15},
  {256, 16},
  {9999, 99},
  {10000, 100},
  {999999999999, 999999},
  {1000000000000, 1000000},
  {999999999999999999999999, 999999999999},
  {1000000000000000000000000, 1000000000000}
]
```

## Continued Fraction Expansion of Irrational Square Roots of Integers

Let's walk through an example, so we can get a feel for how this goes.
Consider $$ \sqrt{23} $$.  Of course, `isqrt(23) = 4`, so we write

$$ \sqrt{23} = 4 + (\sqrt{23} - 4) = 4 + \frac{1}{1/(\sqrt{23} - 4)} $$

and then rationalize the denominator of $$ 1/(\sqrt{23} - 4) $$ by multiplying it by
$$ 1 = \frac{\sqrt{23} + 4}{\sqrt{23} + 4} $$.

Since $$ (\sqrt{23} - 4)(\sqrt{23} + 4) = 23 - 16 = 7 $$, we conclude that

$$ \sqrt{23} = 4 + \frac{1}{(\sqrt{23} + 4) / 7} = 4 + \frac{1}{1 + (\sqrt{23} - 3) / 7} $$,
where we have pulled out the integer portion of the irrational fraction to find the first term of
our continued fraction expansion, which happens to be $$1$$.

To find the second term, we start with a new value less than 1 to
approximate.  The first time around, we were approximating $$
\sqrt{23} - 4 $$; this time we wish to approximate $$(\sqrt{23} -
3)/7$$.  The method we use is pretty much the same: first, we rewrite
it as 1 over its inverse, and then we rationalize the irrational
denominator and finally, extract the integer portion of the resulting
fraction, which will be the next term in the continued fraction
expansion.

$$ (\sqrt{23} - 3)/7 = \frac{1}{7/(\sqrt{23} - 3)} $$

$$ \frac{7}{(\sqrt{23} - 3)} = \frac{7(\sqrt{23} + 3)}{23 - 9} = \frac{\sqrt{23} + 3}{2} $$
$$ = 3 + \frac{\sqrt{23} - 3}{2} $$

Therefore
$$ (\sqrt{23} - 3) / 7 = \frac{1}{3 + (\sqrt{23} - 3)/2} $$,
the second term in the continued fraction expansion is $$3$$, and the next irrational fraction less
than one to be approximated, to get the third term, is $$(\sqrt{23} - 3)/2$$.

Rinse and repeat.  Invert the fraction, rationalize the denominator,
and extract a new integer portion, which is the third term in the
expansion.  The fractional part which remains will be the irrational
fraction to approximate, in order to extract the fourth term.

$$ \frac{2}{\sqrt{23} - 3} = \frac{2(\sqrt{23} + 3)}{14} = \frac{\sqrt{23} + 3}{7} = 1 + \frac{\sqrt{23} - 4}{7} $$

So the third term is 1, and the next irrational fraction less than one is
$$ \frac{\sqrt{23} - 4}{7} $$.

Invert, rationalize the denominator, extract the next integer:

$$\frac{7}{\sqrt{23} - 4} = \frac{7(\sqrt{23} + 4)}{7} = \sqrt{23} + 4 = 8 + (\sqrt{23} - 4) $$.

Now, pause.  The next irrational number less than one to approximate
is the *same number with which we started the expansion*, $$
\sqrt{23} - 4 $$. This means that when we continue this expansion,
from now on, we will simply repeat the same sequence of terms $$(1, 3,
1, 8)$$ forever.  (By the way, it turns out that it is not an accident
that the final term in the expansion before this recurrence is exactly
twice the initial `isqrt(23) = 4`; this pattern will always occur.)

$$\sqrt{23} = 4 + \dfrac{1}{1 + \dfrac{1}{3 + \dfrac{1}{1 + \dfrac{1}{8 + ...}}}} $$

One interesting feature of this example expansion is, that every
integer denominator we computed was a factor of the following
difference of squares.  The first non-trivial denominator we found was
$$ 23 - 16 = 7 $$, which was a factor of $$ 23 - 9 = 14 $$.  Dividing
that out gave us $$ 2 $$, which was again a factor of $$ 14 $$.
Dividing those gave another $$ 7 $$, which was equal to the next
difference of squares, again $$ 23 - 16 $$.  So we never had to answer
the question, what is the largest integer smaller than $$ n \sqrt{23}
$$ for some $$ n > 1 $$? Doing so would require us to compute the
`isqrt` function of $$ 23n^2 $$, potentially on each iteration of the
expansion.  This raises the question, for an arbitrary expansion of
this kind, will this feature always hold, or should we expect to need
to repeatedly evaluate `isqrt` for numbers larger than the number for
which we are deriving the expansion of the square root?

In fact, we do not ever need to recompute the `isqrt` function to
carry out an expansion.  In particular, if we denote the terms of the
expansion of $$ \sqrt{n} $$ as $$ a_i $$, with $$ i = {0, 1, ...} $$,
we have the formula

$$ a_i = \lfloor \dfrac{\lfloor\sqrt{n}\rfloor + p_i}{q_i} \rfloor $$, with $$ p_0 = 0, q_0 = 1 $$,
and the recurrence relations

$$ p_j = a_{j-1}q_{j-1} - p_{j-1} $$, $$ q_j = \dfrac{n - {p_j}^2}{q_{j-1}} $$

In these terms, the property we want to be true is that $$ q_j $$ is
always an integer, rather than merely a rational number.  For now,
let's write the recurrence code so that it will generate an error if
we ever arrive at a non-integer value of $$ q_j $$.

```elixir
defmodule ContFrac do
  defp recur(n2, a0, p \\ 0, q \\ 1, terms \\ []) do
      a_prev = case terms do
        [] -> a0
        [ap | _] -> ap
      end
      pn = a_prev * q - p
      num = n2 - pn * pn
      if num == 0 do
        raise("Expanding sqrt #{n2}: terminating expansion error")
      end
      if rem(num, q) != 0 do
        raise("Expanding sqrt #{n2}: #{num} indivisible by #{q}")
      end
      qn = div(num, q)
      an = div(a0 + pn, qn)
      nterms = [an | terms]
      if an == 2 * a0 do
        {a0, Enum.reverse(nterms)}
      else
        recur(n2, a0, pn, qn, nterms)
    end
  end
  def expand(n2) do
    recur(n2, Isqrt.isqrt(n2))
  end
end
```

<!-- livebook:{"output":true} -->

```
{:module, ContFrac, <<70, 79, 82, 49, 0, 0, 13, ...>>, ...}
```

```elixir
ContFrac.expand(23)
```

<!-- livebook:{"output":true} -->

```
{4, [1, 3, 1, 8]}
```

Now we can count how many continued fraction expansions for
$$ \sqrt{N}, N < 10000 $$ have an odd period, pretty easily.

```elixir
defmodule Counter do
  def odd_periods(n) do
    2..n |>
      Enum.filter(fn x ->
        sx = Isqrt.isqrt(x)
        x > sx * sx
      end ) |>
      Enum.map(fn x -> {x, ContFrac.expand(x)} end) |>
      Enum.filter(fn {_x, {_a0, terms}} -> rem(length(terms), 2) > 0 end) |>
      Enum.count()
  end
end
```

<!-- livebook:{"output":true} -->

```
{:module, Counter, <<70, 79, 82, 49, 0, 0, 10, ...>>, ...}
```

```elixir
Counter.odd_periods(13)
```

<!-- livebook:{"output":true} -->

```
4
```

```elixir
Counter.odd_periods(10000)
```

<!-- livebook:{"output":true} -->

```
1322
```

```elixir
ContFrac.expand(1000)
```

<!-- livebook:{"output":true} -->

```
{31, [1, 1, 1, 1, 1, 6, 2, 2, 15, 2, 2, 6, 1, 1, 1, 1, 1, 62]}
```

## Represent Rational Numbers

Another preliminary to implement, because we will see later that we
need it, is some convenient way to represent and manipulate rational
numbers.  We don't need much here, so we just represent them as
2-tuples of integers, and define the bare minimum of operations on
them.

```elixir
defmodule Rational do
  def new(num, denom) do
    {n, d} =
      if denom < 0 do
        {-num, -denom}
      else
        {num, denom}
      end
    gcd = Integer.gcd(n, d)
    {div(n, gcd), div(d, gcd)}
  end
  def inv({n, d}) do
    new(d, n)
  end
  def add({n1, d1}, {n2, d2}) do
    new(n1 * d2 + n2 * d1, d1 * d2)
  end
  def subtract({n1, d1}, {n2, d2}) do
    new(n1 * d2 - n2 * d1, d1 * d2)
  end
  def multiply({n1, d1}, {n2, d2}) do
    new(n1 * n2, d1 * d2)
  end
  def trunc({n, d}) do
    div(n, d)
  end
end
```

<!-- livebook:{"output":true} -->

```
{:module, Rational, <<70, 79, 82, 49, 0, 0, 15, ...>>, ...}
```

Let's check that things are behaving as we expect, using just a few examples:

```elixir
[
  Rational.add(Rational.new(1, 6), Rational.new(1, 8)),
  Rational.multiply(Rational.new(1, 2), Rational.new(2, -3)),
  Rational.subtract(Rational.new(1, 4), Rational.new(1, 2)),
  Rational.trunc(Rational.new(4, -3)),
  Rational.inv(Rational.new(3, 2)),
]
```

<!-- livebook:{"output":true} -->

```
[{7, 24}, {-1, 3}, {-1, 4}, -1, {2, 3}]
```

## Convergents of the Square Root of 2

Let's take a look at the approximations to $$ \sqrt{2} $$ we get from its continued fraction expansion.

```elixir
ContFrac.expand(2)
```

<!-- livebook:{"output":true} -->

```
{1, [2]}
```

```elixir
defmodule Conv do
  def terms({a0, as}) do
    Stream.concat([a0], Stream.cycle(as))
  end
  def convergent(rterms, acc \\ Rational.new(0, 1)) do
    case rterms do
      [a0] ->
        Rational.add(Rational.new(a0, 1), acc)
      [a | rest] ->
        acc1 = Rational.inv(Rational.add(Rational.new(a, 1), acc))
        convergent(rest, acc1)
    end
  end
  def conv(expansion, n) do
    rts = Enum.take(terms(expansion), n + 1) |> Enum.reverse()
    convergent(rts)
  end
  def ndigits(n) do
    length(Integer.to_charlist(n))
  end
end
```

<!-- livebook:{"output":true} -->

```
{:module, Conv, <<70, 79, 82, 49, 0, 0, 13, ...>>, ...}
```

```elixir
1..8 |> Enum.map(fn n -> Conv.conv(ContFrac.expand(2), n) end)
```

<!-- livebook:{"output":true} -->

```
[{3, 2}, {7, 5}, {17, 12}, {41, 29}, {99, 70}, {239, 169}, {577, 408}, {1393, 985}]
```

```elixir
1..1000 |>
  Task.async_stream(fn n -> Conv.conv(ContFrac.expand(2), n) end) |>
  Stream.map(fn {:ok, v} -> v end) |>
  Enum.filter(fn {num, den} -> Conv.ndigits(num) > Conv.ndigits(den) end) |>
  Enum.count()
```

<!-- livebook:{"output":true} -->

```
153
```

## Continued Fraction Expansion of e

The continued fraction expansion of $$ e $$ looks like

$$ e \sim [2; 1, 2, 1, 1, 4, 1, 1, 6, 1, ..., 1, 2k, 1, ... ] $$

```elixir
defmodule ExpContFrac do
  def istream2() do
    Stream.iterate(2, fn n -> n + 2 end)
  end
  def expFracStream() do
    Stream.concat([2], Stream.flat_map(istream2(), fn n -> [1, n, 1] end))
  end
end
Enum.take(ExpContFrac.expFracStream(), 20)
```

<!-- livebook:{"output":true} -->

```
[2, 1, 2, 1, 1, 4, 1, 1, 6, 1, 1, 8, 1, 1, 10, 1, 1, 12, 1, 1]
```

```elixir
1..10 |>
  Enum.map(fn n ->
    Conv.convergent(Enum.reverse(
      Enum.take(ExpContFrac.expFracStream(), n)))
    end)
```

<!-- livebook:{"output":true} -->

```
[{2, 1}, {3, 1}, {8, 3}, {11, 4}, {19, 7}, {87, 32}, {106, 39}, {193, 71}, {1264, 465}, {1457, 536}]
```

```elixir
{e_num100, e_denom100} = Conv.convergent(Enum.reverse(Enum.take(ExpContFrac.expFracStream(), 100)))
```

<!-- livebook:{"output":true} -->

```
{6963524437876961749120273824619538346438023188214475670667,
 2561737478789858711161539537921323010415623148113041714756}
```

```elixir
Integer.to_charlist(e_num100) |>
  Enum.reduce(0, fn c, s -> s + (c - ?0) end)
```

<!-- livebook:{"output":true} -->

```
272
```

## Pell's Equation

See https://en.wikipedia.org/wiki/Pell%27s_equation to jump to the solution, given by:

Let $$ h_{i}/k_{i} $$ denote the sequence of convergents to the
regular continued fraction for $$ \sqrt{n} $$. This sequence is
unique. Then the pair of positive integers $$ (x_{1},y_{1}) $$ solving
Pell's equation $$ x^2 - n y^2 = 1 $$ and minimizing $$ x $$ satisfies
$$ x_1 = h_i, y_1 = k_i $$ for some $$ i $$. This pair is called the
fundamental solution.

The sequence of integers
$$ [a_{0};a_{1},a_{2},\ldots ] $$ in the regular continued fraction of
$$ \sqrt {n} $$ is always eventually periodic. It can be written in the form
$$ \left[\lfloor {\sqrt {n}}\rfloor ;{\overline {a_{1},a_{2},\ldots ,a_{p-1},2\lfloor {\sqrt {n}}\rfloor }}\right] $$, where
$$ a_{1},a_{2},\ldots ,a_{p-1},2\lfloor {\sqrt {n}}\rfloor $$ is the periodic part repeating indefinitely. Moreover, the tuple
$$ (a_{1},a_{2},\ldots ,a_{p-1}) $$ is palindromic. It reads the same from left to right as from right to left.

The fundamental solution is then

$$ (x_{1},y_{1})={\begin{cases}(h_{p-1},k_{p-1}),&{\text{ for }}p{\text{ even}}\\(h_{2p-1},k_{2p-1}),&{\text{ for }}p{\text{ odd}}\end{cases}} $$

```elixir
defmodule Pells do
  def fun_solution(d) do
    expansion = ContFrac.expand(d)
    {_a0, as} = expansion
    period = length(as)
    if rem(period, 2) == 0 do
      Conv.conv(expansion, period - 1)
    else
      Conv.conv(expansion, 2 * period - 1)
    end
  end
end
[2, 3, 5, 6, 7] |> Enum.map(&Pells.fun_solution/1)
```

<!-- livebook:{"output":true} -->

```
[{3, 2}, {2, 1}, {9, 4}, {5, 2}, {8, 3}]
```

```elixir
2..1000 |>
  Enum.filter(fn d ->
    x = Isqrt.isqrt(d)
    x * x < d
  end) |>
  Enum.max_by(fn d ->
    {x, _y} = Pells.fun_solution(d)
    x
  end)
```

<!-- livebook:{"output":true} -->

```
661
```

```elixir
{x661, y661} = Pells.fun_solution(661)
```

<!-- livebook:{"output":true} -->

```
{16421658242965910275055840472270471049, 638728478116949861246791167518480580}
```

```elixir
x661 * x661 - 661 * y661 * y661
```

<!-- livebook:{"output":true} -->

```
1
```

```elixir
{a0_661, as_661} = ContFrac.expand(661)
```

<!-- livebook:{"output":true} -->

```
{25,
 [1, 2, 2, 4, 4, 16, 1, 9, 2, 1, 12, 5, 1, 1, 1, 2, 1, 3, 1, 1, 3, 1, 2, 1, 1, 1, 5, 12, 1, 2, 9, 1,
  16, 4, 4, 2, 2, 1, 50]}
```

```elixir
length(as_661)
```

<!-- livebook:{"output":true} -->

```
39
```

## Just for fun, peek at CF expansions of first few square roots

```elixir
[2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24] |>
  Enum.map(fn n -> {n, ContFrac.expand(n)} end) |>
  Enum.each(fn expansion -> IO.inspect(expansion, charlists: :as_lists) end)
```

<!-- livebook:{"output":true} -->

```
{2, {1, [2]}}
{3, {1, [1, 2]}}
{5, {2, [4]}}
{6, {2, [2, 4]}}
{7, {2, [1, 1, 1, 4]}}
{8, {2, [1, 4]}}
{10, {3, [6]}}
{11, {3, [3, 6]}}
{12, {3, [2, 6]}}
{13, {3, [1, 1, 1, 1, 6]}}
{14, {3, [1, 2, 1, 6]}}
{15, {3, [1, 6]}}
{17, {4, [8]}}
{18, {4, [4, 8]}}
{19, {4, [2, 1, 3, 1, 2, 8]}}
{20, {4, [2, 8]}}
{21, {4, [1, 1, 2, 1, 1, 8]}}
{22, {4, [1, 2, 4, 2, 1, 8]}}
{23, {4, [1, 3, 1, 8]}}
{24, {4, [1, 8]}}
```

<!-- livebook:{"output":true} -->

```
:ok
```
